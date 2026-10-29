// Offline capture helper for a future separately authorized synthetic fixture run.
// It intentionally exposes no exception text, process identity, or paths.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace YTraceOfflineCapture
{
    public sealed class StreamCapture
    {
        public string[] Lines { get; internal set; }
        public int SuppressedLineCount { get; internal set; }
        public long TotalLineCount { get; internal set; }
        public bool HadData { get; internal set; }
        public bool LimitExceeded { get; internal set; }
        public bool ReadFailed { get; internal set; }
    }

    public sealed class ChildCaptureResult
    {
        public bool LaunchAttempted { get; internal set; }
        public bool Started { get; internal set; }
        public bool ProcessTerminated { get; internal set; }
        public bool CaptureComplete { get; internal set; }
        public bool TimedOut { get; internal set; }
        public bool HasExitCode { get; internal set; }
        public int ExitCode { get; internal set; }
        public StreamCapture StandardOutput { get; internal set; }
        public StreamCapture StandardError { get; internal set; }
    }

    public static class BoundedChildCapture
    {
        private const int MaxLineChars = 4096;
        private const int MaxStoredLines = 256;
        private const long MaxStreamChars = 1048576;
        private const int RunTimeoutMilliseconds = 120000;
        private const int StopWaitMilliseconds = 5000;

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, ExactSpelling = true)]
        private static extern bool CreateDirectoryW(string pathName, IntPtr securityAttributes);

        public static bool CreateDirectoryExclusive(string pathName)
        {
            if (String.IsNullOrEmpty(pathName)) return false;
            try { return CreateDirectoryW(pathName, IntPtr.Zero); }
            catch { return false; }
        }

        public static ChildCaptureResult Run(
            string executable,
            string harnessPath,
            string workingDirectory,
            string fixtureDirectory,
            string windowsDirectory,
            string powershellHome)
        {
            var result = new ChildCaptureResult { ExitCode = -1 };
            Process process = null;
            Task<StreamCapture> stdoutTask = null;
            Task<StreamCapture> stderrTask = null;
            try
            {
                var start = new ProcessStartInfo
                {
                    FileName = executable,
                    Arguments = "-NoLogo -NoProfile -NonInteractive -File " + Quote(harnessPath),
                    WorkingDirectory = workingDirectory,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardInput = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardOutputEncoding = new UTF8Encoding(false, false),
                    StandardErrorEncoding = new UTF8Encoding(false, false)
                };

                var environment = start.EnvironmentVariables;
                environment.Clear();
                environment["SystemRoot"] = windowsDirectory;
                environment["WINDIR"] = windowsDirectory;
                environment["TEMP"] = fixtureDirectory;
                environment["TMP"] = fixtureDirectory;
                environment["PSModulePath"] = Path.Combine(powershellHome, "Modules");
                environment["PATH"] = Path.Combine(windowsDirectory, "System32") + ";" + powershellHome;

                process = new Process { StartInfo = start };
                result.LaunchAttempted = true;
                if (!process.Start()) return result;
                result.Started = true;
                process.StandardInput.Close();

                stdoutTask = Task.Factory.StartNew(
                    () => ReadBounded(process.StandardOutput, true),
                    CancellationToken.None,
                    TaskCreationOptions.LongRunning,
                    TaskScheduler.Default);
                stderrTask = Task.Factory.StartNew(
                    () => ReadBounded(process.StandardError, false),
                    CancellationToken.None,
                    TaskCreationOptions.LongRunning,
                    TaskScheduler.Default);

                if (process.WaitForExit(RunTimeoutMilliseconds))
                {
                    result.ProcessTerminated = true;
                }
                else
                {
                    result.TimedOut = true;
                    try { process.Kill(); } catch { }
                    try { result.ProcessTerminated = process.WaitForExit(StopWaitMilliseconds); }
                    catch { result.ProcessTerminated = false; }
                }

                if (!result.ProcessTerminated) return result;

                try
                {
                    var tasks = new Task[] { stdoutTask, stderrTask };
                    if (!Task.WaitAll(tasks, StopWaitMilliseconds)) return result;
                    result.StandardOutput = stdoutTask.Result;
                    result.StandardError = stderrTask.Result;
                    result.HasExitCode = true;
                    result.ExitCode = process.ExitCode;
                    result.CaptureComplete =
                        result.StandardOutput != null && result.StandardError != null &&
                        !result.StandardOutput.ReadFailed && !result.StandardError.ReadFailed &&
                        !result.StandardOutput.LimitExceeded && !result.StandardError.LimitExceeded;
                }
                catch
                {
                    result.CaptureComplete = false;
                }
                return result;
            }
            catch
            {
                // Deliberately retain only fixed result fields. Exception text can contain paths or identity data.
                if (process != null && result.LaunchAttempted)
                {
                    try
                    {
                        if (!process.HasExited) process.Kill();
                        result.ProcessTerminated = process.WaitForExit(StopWaitMilliseconds);
                    }
                    catch { result.ProcessTerminated = false; }
                }
                return result;
            }
            finally
            {
                if (process != null) process.Dispose();
            }
        }

        private static string Quote(string value)
        {
            if (value == null || value.IndexOf('"') >= 0) throw new ArgumentException();
            return "\"" + value + "\"";
        }

        private static StreamCapture ReadBounded(StreamReader reader, bool retainSafeSizedLines)
        {
            var result = new StreamCapture();
            var lines = new List<string>();
            var current = new StringBuilder();
            var buffer = new char[4096];
            long totalChars = 0;
            bool lineTooLong = false;
            bool lineHasCharacters = false;
            bool previousWasCarriageReturn = false;

            try
            {
                int read;
                while ((read = reader.Read(buffer, 0, buffer.Length)) > 0)
                {
                    for (int index = 0; index < read; index++)
                    {
                        char value = buffer[index];
                        result.HadData = true;
                        totalChars++;
                        if (totalChars > MaxStreamChars) result.LimitExceeded = true;

                        if (value == '\r')
                        {
                            FinishLine(result, lines, current, retainSafeSizedLines,
                                ref lineTooLong, ref lineHasCharacters);
                            previousWasCarriageReturn = true;
                            continue;
                        }
                        if (value == '\n')
                        {
                            if (previousWasCarriageReturn)
                            {
                                previousWasCarriageReturn = false;
                                continue;
                            }
                            FinishLine(result, lines, current, retainSafeSizedLines,
                                ref lineTooLong, ref lineHasCharacters);
                            continue;
                        }

                        previousWasCarriageReturn = false;
                        lineHasCharacters = true;
                        if (totalChars > MaxStreamChars)
                        {
                            lineTooLong = true;
                            continue;
                        }
                        if (retainSafeSizedLines && !lineTooLong)
                        {
                            if (current.Length < MaxLineChars) current.Append(value);
                            else lineTooLong = true;
                        }
                    }
                }

                if (lineHasCharacters || lineTooLong)
                {
                    FinishLine(result, lines, current, retainSafeSizedLines,
                        ref lineTooLong, ref lineHasCharacters);
                }
            }
            catch
            {
                result.ReadFailed = true;
            }

            result.Lines = lines.ToArray();
            return result;
        }

        private static void FinishLine(
            StreamCapture result,
            List<string> lines,
            StringBuilder current,
            bool retainSafeSizedLines,
            ref bool lineTooLong,
            ref bool lineHasCharacters)
        {
            result.TotalLineCount++;
            if (retainSafeSizedLines && !lineTooLong && lines.Count < MaxStoredLines)
            {
                lines.Add(current.ToString());
            }
            else
            {
                result.SuppressedLineCount++;
            }

            if (lineTooLong || result.TotalLineCount > MaxStoredLines)
                result.LimitExceeded = true;
            current.Length = 0;
            lineTooLong = false;
            lineHasCharacters = false;
        }
    }
}
