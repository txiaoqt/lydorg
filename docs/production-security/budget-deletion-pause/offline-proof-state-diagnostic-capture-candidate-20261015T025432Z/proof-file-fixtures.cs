// OFFLINE DIAGNOSTIC COPY ONLY. NOT AUTHORIZED FOR EXECUTION.
// NON-RUNNABLE FIXTURE-ONLY PROTOTYPE. Never add a production root or CLI root input.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace YTraceOfflineProofState
{
    public sealed class FixtureFault : Exception
    {
        public readonly string Code;
        public readonly string Stage;
        public readonly int? NativeErrorCode;

        public FixtureFault(string code) : this("FIXTURE_OPERATION", code, null, null) { }
        public FixtureFault(string code, int? nativeErrorCode) : this("FIXTURE_OPERATION", code, nativeErrorCode, null) { }
        public FixtureFault(string stage, string code, int? nativeErrorCode) : this(stage, code, nativeErrorCode, null) { }
        public FixtureFault(string stage, string code, int? nativeErrorCode, Exception inner)
            : base(code, inner)
        {
            Stage = !String.IsNullOrEmpty(stage) && Regex.IsMatch(stage, @"\A[A-Z0-9_]{1,64}\z", RegexOptions.CultureInvariant)
                ? stage : "FIXTURE_OPERATION";
            Code = !String.IsNullOrEmpty(code) && Regex.IsMatch(code, @"\A[A-Z0-9_]{1,64}\z", RegexOptions.CultureInvariant)
                ? code : "FIXTURE_OPERATION_FAILED";
            NativeErrorCode = nativeErrorCode.HasValue && nativeErrorCode.Value >= 0 ? nativeErrorCode : null;
        }
    }

    public enum FixtureFailure
    {
        None,
        BeforeArchiveSubmit,
        AfterArchiveNativeSuccess,
        BeforeProofCreate,
        AfterProofCreate,
        AfterProofPartialWrite,
        AfterProofFlush
    }

    internal static class Win32
    {
        internal const uint GenericRead = 0x80000000;
        internal const uint Delete = 0x00010000;
        internal const uint ReadAttributes = 0x00000080;
        internal const uint ShareRead = 0x00000001;
        internal const uint ShareAll = 0x00000007;
        internal const uint OpenExisting = 3;
        internal const uint BackupSemantics = 0x02000000;
        internal const uint OpenReparsePoint = 0x00200000;
        internal const uint FileAttributeDirectory = 0x10;
        internal const uint FileAttributeReparsePoint = 0x400;
        internal const uint InvalidFileAttributes = 0xffffffff;

        [StructLayout(LayoutKind.Sequential)]
        internal struct FileTimeParts
        {
            internal uint Low;
            internal uint High;
            internal long Ticks { get { return ((long)High << 32) | Low; } }
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct ByHandleFileInformation
        {
            internal uint Attributes;
            internal FileTimeParts Creation;
            internal FileTimeParts Access;
            internal FileTimeParts Write;
            internal uint VolumeSerial;
            internal uint SizeHigh;
            internal uint SizeLow;
            internal uint Links;
            internal uint IndexHigh;
            internal uint IndexLow;
            internal string Id { get { return VolumeSerial.ToString("x8", CultureInfo.InvariantCulture) + ":" +
                IndexHigh.ToString("x8", CultureInfo.InvariantCulture) + IndexLow.ToString("x8", CultureInfo.InvariantCulture); } }
            internal long Size { get { return ((long)SizeHigh << 32) | SizeLow; } }
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        internal static extern bool CreateDirectoryW(string path, IntPtr securityAttributes);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        internal static extern SafeFileHandle CreateFileW(string path, uint access, uint share,
            IntPtr securityAttributes, uint creation, uint flags, IntPtr template);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool GetFileInformationByHandle(SafeFileHandle handle, out ByHandleFileInformation info);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        internal static extern uint GetFinalPathNameByHandleW(SafeFileHandle handle, StringBuilder path, uint size, uint flags);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool SetFileInformationByHandle(SafeFileHandle handle, int infoClass, IntPtr info, uint size);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        internal static extern uint GetFileAttributesW(string path);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool CreateHardLinkW(string newName, string existingName, IntPtr securityAttributes);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool CreateSymbolicLinkW(string linkName, string targetName, uint flags);

        internal static void Need(bool ok, string code, string stage = "FIXTURE_VALIDATION")
        {
            if (!ok) throw new FixtureFault(stage, code, null);
        }

        internal static ByHandleFileInformation Info(SafeFileHandle handle)
        {
            ByHandleFileInformation info;
            if (!GetFileInformationByHandle(handle, out info))
            {
                int error = Marshal.GetLastWin32Error();
                throw new FixtureFault("NATIVE_FILE_INFO", "HANDLE_INFO_FAILED", error);
            }
            return info;
        }

        internal static string FinalPath(SafeFileHandle handle)
        {
            var buffer = new StringBuilder(32768);
            uint size = GetFinalPathNameByHandleW(handle, buffer, (uint)buffer.Capacity, 0);
            if (size == 0)
            {
                int error = Marshal.GetLastWin32Error();
                throw new FixtureFault("NATIVE_FINAL_PATH", "FINAL_PATH_FAILED", error);
            }
            if (size >= buffer.Capacity) throw new FixtureFault("NATIVE_FINAL_PATH", "FINAL_PATH_FAILED", null);
            string value = buffer.ToString();
            if (!value.StartsWith(@"\\?\", StringComparison.Ordinal)) throw new FixtureFault("FINAL_PATH_NAMESPACE");
            return value.Substring(4).TrimEnd('\\');
        }
    }

    // A scope can only be created beneath the process temporary directory; callers cannot supply a root.
    public sealed class FixtureScope
    {
        private readonly string root;
        private static readonly Regex CasePattern = new Regex(@"\A[A-Za-z0-9][A-Za-z0-9_-]{0,39}\z", RegexOptions.CultureInvariant);
        private static readonly Regex LeafPattern = new Regex(@"\A[A-Za-z0-9][A-Za-z0-9_.-]{0,63}\z", RegexOptions.CultureInvariant);
        public string RootPath { get { return root; } }

        private FixtureScope(string value) { root = value; }

        public static FixtureScope Create()
        {
            if (!OperatingSystem.IsWindows() || IntPtr.Size != 8)
                throw new FixtureFault("FIXTURE_SCOPE_PLATFORM", "WINDOWS_X64_REQUIRED", null);
            string temp;
            try { temp = Path.GetFullPath(Path.GetTempPath()).TrimEnd('\\'); }
            catch (Exception ex) { throw new FixtureFault("FIXTURE_SCOPE_TEMP_PATH_RESOLVE", "TEMP_PATH_RESOLVE_FAILED", null, ex); }
            string path;
            try { path = Path.Combine(temp, "ytrace-proof-fixture-" + Guid.NewGuid().ToString("N")); }
            catch (Exception ex) { throw new FixtureFault("FIXTURE_SCOPE_PATH_BUILD", "FIXTURE_SCOPE_PATH_BUILD_FAILED", null, ex); }
            if (!IsWithin(temp, path)) throw new FixtureFault("FIXTURE_SCOPE_PATH_CHECK", "TEMP_SCOPE_INVALID", null);
            if (!Win32.CreateDirectoryW(path, IntPtr.Zero))
            {
                int error = Marshal.GetLastWin32Error();
                throw new FixtureFault("FIXTURE_SCOPE_DIRECTORY_CREATE",
                    error == 183 ? "TEMP_SCOPE_COLLISION" : "TEMP_SCOPE_CREATE_FAILED", error);
            }
            var scope = new FixtureScope(path);
            List<SafeFileHandle> chain;
            try { chain = FixturePath.HoldDirectoryChain(path, path); }
            catch (FixtureFault) { throw; }
            catch (Exception ex) { throw new FixtureFault("FIXTURE_SCOPE_CHAIN_VERIFY", "FIXTURE_CHAIN_VERIFY_FAILED", null, ex); }
            try { FixturePath.Release(chain); }
            catch (Exception ex) { throw new FixtureFault("FIXTURE_SCOPE_CHAIN_RELEASE", "FIXTURE_CHAIN_RELEASE_FAILED", null, ex); }
            return scope;
        }

        public string CreateCase(string name)
        {
            ValidateCase(name);
            string path = Path.Combine(root, name);
            if (!IsWithin(root, path)) throw new FixtureFault("FIXTURE_CASE_PATH_CHECK", "FIXTURE_CASE_OUTSIDE_SCOPE", null);
            if (!Win32.CreateDirectoryW(path, IntPtr.Zero))
            {
                int error = Marshal.GetLastWin32Error();
                throw new FixtureFault("FIXTURE_CASE_DIRECTORY_CREATE",
                    error == 183 ? "FIXTURE_CASE_EXISTS" : "FIXTURE_CASE_CREATE_FAILED", error);
            }
            return path;
        }

        public string CasePath(string name)
        {
            ValidateCase(name);
            string path = Path.GetFullPath(Path.Combine(root, name));
            if (!IsWithin(root, path)) throw new FixtureFault("FIXTURE_CASE_OUTSIDE_SCOPE");
            return path;
        }

        public string FilePath(string caseName, string leaf)
        {
            ValidateLeaf(leaf);
            string parent = CasePath(caseName);
            string path = Path.GetFullPath(Path.Combine(parent, leaf));
            if (!IsWithin(root, path) || !String.Equals(Path.GetDirectoryName(path), parent, StringComparison.OrdinalIgnoreCase))
                throw new FixtureFault("FIXTURE_FILE_OUTSIDE_SCOPE");
            return path;
        }

        public void WriteNewFile(string caseName, string leaf, byte[] bytes)
        {
            string path = FilePath(caseName, leaf);
            using (var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 4096, FileOptions.WriteThrough))
            {
                stream.Write(bytes, 0, bytes.Length);
                stream.Flush(true);
            }
        }

        public bool TryCreateHardLink(string caseName, string newLeaf, string existingLeaf, out string safeCode)
        {
            string newPath = FilePath(caseName, newLeaf);
            string existingPath = FilePath(caseName, existingLeaf);
            bool ok = Win32.CreateHardLinkW(newPath, existingPath, IntPtr.Zero);
            safeCode = ok ? "CREATED" : "HARDLINK_FIXTURE_UNAVAILABLE";
            return ok;
        }

        public bool TryCreateDirectoryLink(string linkName, string targetName, out string safeCode)
        {
            string linkPath = CasePath(linkName);
            string targetPath = CasePath(targetName);
            const uint directory = 1;
            const uint allowUnprivilegedCreate = 2;
            bool ok = Win32.CreateSymbolicLinkW(linkPath, targetPath, directory | allowUnprivilegedCreate);
            safeCode = ok ? "CREATED" : "REPARSE_FIXTURE_UNAVAILABLE";
            return ok;
        }

        internal string FullCasePath(string caseName) { return CasePath(caseName); }
        internal static void ValidateLeaf(string leaf)
        {
            if (leaf == null || !LeafPattern.IsMatch(leaf) || leaf.EndsWith(".", StringComparison.Ordinal) ||
                leaf.EndsWith(" ", StringComparison.Ordinal) || Regex.IsMatch(leaf,
                @"\A(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\.|\z)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
                throw new FixtureFault("UNSAFE_FIXTURE_LEAF");
        }

        private static void ValidateCase(string name)
        {
            if (name == null || !CasePattern.IsMatch(name) || name.EndsWith(".", StringComparison.Ordinal) ||
                name.EndsWith(" ", StringComparison.Ordinal)) throw new FixtureFault("UNSAFE_FIXTURE_CASE");
        }

        internal static bool IsWithin(string parent, string child)
        {
            string p = Path.GetFullPath(parent).TrimEnd('\\') + "\\";
            string c = Path.GetFullPath(child);
            return c.StartsWith(p, StringComparison.OrdinalIgnoreCase);
        }
    }

    public sealed class SourceBinding
    {
        public string ParentId { get; internal set; }
        public string SourceId { get; internal set; }
        public string Sha256 { get; internal set; }
        public long Bytes { get; internal set; }
        public long CreationTicks { get; internal set; }
        public long LastWriteTicks { get; internal set; }
    }

    public sealed class ArchiveResult
    {
        public string Status { get; internal set; }
        public string Code { get; internal set; }
        public int Submissions { get; internal set; }
        // Numeric native error is retained only for fixture diagnostics. Never log paths or exception text.
        public int NativeErrorCode { get; internal set; }
    }

    internal static class FixturePath
    {
        internal static List<SafeFileHandle> HoldDirectoryChain(string directory, string root)
        {
            string full = Path.GetFullPath(directory);
            string rootFull = Path.GetFullPath(root);
            if (!String.Equals(full, rootFull, StringComparison.OrdinalIgnoreCase) &&
                !FixtureScope.IsWithin(rootFull, full))
                throw new FixtureFault("FIXTURE_CHAIN_PATH_CHECK", "FIXTURE_PATH_INVALID", null);
            string drive = Path.GetPathRoot(full);
            if (drive == null || !Regex.IsMatch(drive, @"\A[A-Za-z]:\\\z", RegexOptions.CultureInvariant))
                throw new FixtureFault("FIXTURE_CHAIN_DRIVE_CHECK", "LOCAL_DRIVE_REQUIRED", null);
            var paths = new List<string> { drive };
            string current = drive;
            foreach (string part in full.Substring(drive.Length).Split('\\'))
            {
                if (part.Length == 0) continue;
                current = Path.Combine(current, part);
                paths.Add(current);
            }
            var held = new List<SafeFileHandle>();
            try
            {
                for (int i = 0; i < paths.Count; i++)
                {
                    string path = paths[i];
                    var handle = Win32.CreateFileW(path, Win32.ReadAttributes, Win32.ShareRead, IntPtr.Zero,
                        Win32.OpenExisting, Win32.BackupSemantics | Win32.OpenReparsePoint, IntPtr.Zero);
                    if (handle.IsInvalid)
                    {
                        int error = Marshal.GetLastWin32Error();
                        handle.Dispose();
                        throw new FixtureFault("FIXTURE_CHAIN_DIRECTORY_OPEN", "DIRECTORY_OPEN_FAILED", error);
                    }
                    held.Add(handle);
                    var info = Win32.Info(handle);
                    Win32.Need((info.Attributes & Win32.FileAttributeDirectory) != 0, "DIRECTORY_REQUIRED", "FIXTURE_CHAIN_DIRECTORY_CHECK");
                    Win32.Need((info.Attributes & Win32.FileAttributeReparsePoint) == 0, "REPARSE_DIRECTORY_REJECTED", "FIXTURE_CHAIN_REPARSE_CHECK");
                    Win32.Need(String.Equals(Win32.FinalPath(handle), path.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase),
                        "DIRECTORY_FINAL_PATH_MISMATCH", "FIXTURE_CHAIN_FINAL_PATH_CHECK");
                }
                return held;
            }
            catch
            {
                Release(held);
                throw;
            }
        }

        internal static void Release(List<SafeFileHandle> handles)
        {
            if (handles == null) return;
            for (int i = handles.Count - 1; i >= 0; --i) handles[i].Dispose();
        }

        internal static SafeFileHandle OpenSource(string path, bool forRename)
        {
            var handle = Win32.CreateFileW(path, Win32.GenericRead | Win32.ReadAttributes | (forRename ? Win32.Delete : 0),
                forRename ? Win32.ShareRead : Win32.ShareAll, IntPtr.Zero, Win32.OpenExisting, Win32.OpenReparsePoint, IntPtr.Zero);
            if (handle.IsInvalid)
            {
                int error = Marshal.GetLastWin32Error();
                handle.Dispose();
                throw new FixtureFault("FIXTURE_SOURCE_OPEN", "SOURCE_OPEN_FAILED", error);
            }
            try
            {
                var info = Win32.Info(handle);
                Win32.Need((info.Attributes & (Win32.FileAttributeDirectory | Win32.FileAttributeReparsePoint)) == 0, "REGULAR_SOURCE_REQUIRED");
                Win32.Need(info.Links == 1, "HARDLINK_SOURCE_REJECTED");
                Win32.Need(info.Size >= 0 && info.Size <= 65536, "FIXTURE_SOURCE_SIZE_INVALID");
                Win32.Need(String.Equals(Win32.FinalPath(handle), path.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase),
                    "SOURCE_FINAL_PATH_MISMATCH");
                return handle;
            }
            catch { handle.Dispose(); throw; }
        }

        internal static string Hash(FileStream stream)
        {
            stream.Position = 0;
            return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
        }

        internal static void CheckDestinationAbsent(string path)
        {
            Marshal.SetLastPInvokeError(0);
            uint attrs = Win32.GetFileAttributesW(path);
            if (attrs != Win32.InvalidFileAttributes) throw new FixtureFault("ARCHIVE_DESTINATION_ALREADY_EXISTS");
            int error = Marshal.GetLastWin32Error();
            if (error != 2 && error != 3) throw new FixtureFault("ARCHIVE_DESTINATION_STATE_UNKNOWN");
        }

        internal static void Match(SourceBinding expected, SafeFileHandle handle, FileStream stream)
        {
            var info = Win32.Info(handle);
            Win32.Need((info.Attributes & (Win32.FileAttributeDirectory | Win32.FileAttributeReparsePoint)) == 0, "REGULAR_SOURCE_REQUIRED");
            Win32.Need(info.Links == 1, "HARDLINK_SOURCE_REJECTED");
            Win32.Need(info.Id == expected.SourceId && info.Size == expected.Bytes &&
                info.Creation.Ticks == expected.CreationTicks && info.Write.Ticks == expected.LastWriteTicks,
                "SOURCE_BINDING_MISMATCH");
            Win32.Need(Hash(stream) == expected.Sha256, "SOURCE_CONTENT_MISMATCH");
        }
    }

    public static class ArchiveFixtureOps
    {
        public static SourceBinding Capture(FixtureScope scope, string caseName, string sourceLeaf)
        {
            FixtureScope.ValidateLeaf(sourceLeaf);
            string directory = scope.FullCasePath(caseName);
            string source = scope.FilePath(caseName, sourceLeaf);
            List<SafeFileHandle> chain = FixturePath.HoldDirectoryChain(directory, scope.RootPath);
            try
            {
                var parent = Win32.Info(chain[chain.Count - 1]);
                using (var handle = FixturePath.OpenSource(source, false))
                using (var stream = new FileStream(handle, FileAccess.Read))
                {
                    var info = Win32.Info(handle);
                    return new SourceBinding { ParentId = parent.Id, SourceId = info.Id, Sha256 = FixturePath.Hash(stream),
                        Bytes = info.Size, CreationTicks = info.Creation.Ticks, LastWriteTicks = info.Write.Ticks };
                }
            }
            finally { FixturePath.Release(chain); }
        }

        public static PreparedArchive Prepare(FixtureScope scope, string caseName, string sourceLeaf,
            string destinationLeaf, SourceBinding expected)
        {
            FixtureScope.ValidateLeaf(sourceLeaf);
            FixtureScope.ValidateLeaf(destinationLeaf);
            if (String.Equals(sourceLeaf, destinationLeaf, StringComparison.OrdinalIgnoreCase)) throw new FixtureFault("SAME_LEAF_REJECTED");
            if (expected == null) throw new FixtureFault("SOURCE_BINDING_REQUIRED");
            string directory = scope.FullCasePath(caseName);
            string source = scope.FilePath(caseName, sourceLeaf);
            string destination = scope.FilePath(caseName, destinationLeaf);
            List<SafeFileHandle> chain = FixturePath.HoldDirectoryChain(directory, scope.RootPath);
            SafeFileHandle handle = null;
            FileStream stream = null;
            try
            {
                Win32.Need(Win32.Info(chain[chain.Count - 1]).Id == expected.ParentId, "PARENT_BINDING_MISMATCH");
                FixturePath.CheckDestinationAbsent(destination);
                handle = FixturePath.OpenSource(source, true);
                stream = new FileStream(handle, FileAccess.Read);
                FixturePath.Match(expected, handle, stream);
                return new PreparedArchive(source, destination, expected, chain, handle, stream);
            }
            catch
            {
                if (stream != null) stream.Dispose();
                if (handle != null) handle.Dispose();
                FixturePath.Release(chain);
                throw;
            }
        }
    }

    public sealed class PreparedArchive : IDisposable
    {
        private readonly string source;
        private readonly string destination;
        private readonly SourceBinding binding;
        private readonly List<SafeFileHandle> chain;
        private readonly SafeFileHandle handle;
        private readonly FileStream stream;
        private int operationStarted;
        private int submissions;
        public int Submissions { get { return Volatile.Read(ref submissions); } }

        internal PreparedArchive(string sourcePath, string destinationPath, SourceBinding expected,
            List<SafeFileHandle> held, SafeFileHandle sourceHandle, FileStream sourceStream)
        {
            source = sourcePath; destination = destinationPath; binding = expected;
            chain = held; handle = sourceHandle; stream = sourceStream;
        }

        public ArchiveResult SubmitAndVerify(FixtureFailure failure)
        {
            if (Interlocked.Exchange(ref operationStarted, 1) != 0)
                return new ArchiveResult { Status = "BLOCKED_ALREADY_ATTEMPTED", Code = "SECOND_CALL_REJECTED", Submissions = Submissions };
            if (failure == FixtureFailure.BeforeArchiveSubmit)
                return new ArchiveResult { Status = "STOPPED_BEFORE_SUBMISSION", Code = "INJECTED_STOP", Submissions = Submissions };
            try
            {
                Win32.Need(Win32.Info(chain[chain.Count - 1]).Id == binding.ParentId, "PARENT_BINDING_CHANGED");
                Win32.Need(String.Equals(Win32.FinalPath(handle), source.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase),
                    "SOURCE_PATH_CHANGED");
                FixturePath.Match(binding, handle, stream);
                Interlocked.Increment(ref submissions);
                bool ok;
                int error;
                using (var name = new UnicodeBuffer(destination))
                {
                    ok = Win32.SetFileInformationByHandle(handle, 3, name.Pointer, (uint)name.Size);
                    error = ok ? 0 : Marshal.GetLastWin32Error();
                }
                if (!ok)
                {
                    if (error == 80 || error == 183)
                    {
                        try
                        {
                            Win32.Need(String.Equals(Win32.FinalPath(handle), source.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase),
                                "COLLISION_SOURCE_PATH_UNRESOLVED");
                            FixturePath.Match(binding, handle, stream);
                            return new ArchiveResult { Status = "REJECTED_DESTINATION_EXISTS", Code = "NATIVE_NO_REPLACE_COLLISION", Submissions = Submissions, NativeErrorCode = error };
                        }
                        catch { return new ArchiveResult { Status = "UNRESOLVED_AFTER_SUBMISSION", Code = "COLLISION_STATE_UNRESOLVED", Submissions = Submissions }; }
                    }
                    return new ArchiveResult { Status = "UNRESOLVED_AFTER_SUBMISSION", Code = "NATIVE_RENAME_FAILED", Submissions = Submissions, NativeErrorCode = error };
                }
                if (failure == FixtureFailure.AfterArchiveNativeSuccess)
                    return new ArchiveResult { Status = "UNRESOLVED_AFTER_SUBMISSION", Code = "INJECTED_AFTER_NATIVE_SUCCESS", Submissions = Submissions };
                return VerifySuccess();
            }
            catch (Exception ex)
            {
                string code = ex is FixtureFault ff ? ff.Code : "FIXTURE_OPERATION_FAILED";
                return new ArchiveResult
                {
                    Status = Submissions == 0 ? "STOPPED_BEFORE_SUBMISSION" : "UNRESOLVED_AFTER_SUBMISSION",
                    Code = code, Submissions = Submissions
                };
            }
        }

        private ArchiveResult VerifySuccess()
        {
            Win32.Need(String.Equals(Win32.FinalPath(handle), destination.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase),
                "ARCHIVE_FINAL_PATH_MISMATCH");
            var moved = Win32.Info(handle);
            Win32.Need(moved.Id == binding.SourceId && moved.Size == binding.Bytes &&
                moved.Creation.Ticks == binding.CreationTicks && moved.Write.Ticks == binding.LastWriteTicks,
                "ARCHIVE_IDENTITY_OR_METADATA_MISMATCH");
            Win32.Need(FixturePath.Hash(stream) == binding.Sha256, "ARCHIVE_CONTENT_MISMATCH");
            using (var archived = FixturePath.OpenSource(destination, false))
            {
                var info = Win32.Info(archived);
                Win32.Need(info.Id == binding.SourceId && info.Links == 1, "ARCHIVE_PATH_IDENTITY_MISMATCH");
            }
            Marshal.SetLastPInvokeError(0);
            uint attrs = Win32.GetFileAttributesW(source);
            int sourceError = Marshal.GetLastWin32Error();
            Win32.Need(attrs == Win32.InvalidFileAttributes && (sourceError == 2 || sourceError == 3), "SOURCE_ABSENCE_UNRESOLVED");
            return new ArchiveResult { Status = "ARCHIVED_AND_VERIFIED", Code = "OK", Submissions = Submissions };
        }

        public void Dispose()
        {
            if (stream != null) stream.Dispose();
            if (handle != null) handle.Dispose();
            FixturePath.Release(chain);
        }

        private sealed class UnicodeBuffer : IDisposable
        {
            public IntPtr Pointer { get; private set; }
            public int Size { get; private set; }
            public UnicodeBuffer(string path)
            {
                byte[] name = Encoding.Unicode.GetBytes(path);
                Size = Math.Max(32, 20 + name.Length + 2);
                Pointer = Marshal.AllocHGlobal(Size);
                Marshal.Copy(new byte[Size], 0, Pointer, Size);
                Marshal.WriteInt32(Pointer, 0, 0); // ReplaceIfExists=FALSE.
                Marshal.WriteIntPtr(Pointer, 8, IntPtr.Zero); // Null RootDirectory; absolute destination is same-parent and revalidated.
                Marshal.WriteInt32(Pointer, 16, name.Length);
                Marshal.Copy(name, 0, IntPtr.Add(Pointer, 20), name.Length);
            }
            public void Dispose()
            {
                if (Pointer != IntPtr.Zero) { Marshal.FreeHGlobal(Pointer); Pointer = IntPtr.Zero; }
            }
        }
    }

    public sealed class ProofCreateResult
    {
        public string Status { get; internal set; }
        public string Code { get; internal set; }
        public int CreateAttempts { get; internal set; }
        public int Bytes { get; internal set; }
        public string Sha256 { get; internal set; }
    }

    public static class FixtureProofWriter
    {
        private static readonly string[] Fields = { "project", "host", "status", "verifiedVia", "verifiedAt" };
        private static readonly Regex Timestamp = new Regex(
            @"\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})\z",
            RegexOptions.CultureInvariant);
        private const string ProofLeaf = "control-plane-proof.json";

        public static void ValidateSyntheticProof(string json, DateTimeOffset nowUtc)
        {
            if (nowUtc.Offset != TimeSpan.Zero) throw new FixtureFault("NOW_MUST_BE_UTC");
            if (json == null || json.Length > 4096 || json.StartsWith("\uFEFF", StringComparison.Ordinal))
                throw new FixtureFault("PROOF_INPUT_INVALID");
            JsonDocument document;
            try { document = JsonDocument.Parse(json); }
            catch { throw new FixtureFault("PROOF_JSON_INVALID"); }
            using (document)
            {
                if (document.RootElement.ValueKind != JsonValueKind.Object) throw new FixtureFault("PROOF_OBJECT_REQUIRED");
                var values = new Dictionary<string, string>(StringComparer.Ordinal);
                foreach (JsonProperty property in document.RootElement.EnumerateObject())
                {
                    if (!Fields.Contains(property.Name, StringComparer.Ordinal) || values.ContainsKey(property.Name) ||
                        property.Value.ValueKind != JsonValueKind.String) throw new FixtureFault("PROOF_SCHEMA_INVALID");
                    values.Add(property.Name, property.Value.GetString());
                }
                if (values.Count != Fields.Length || Fields.Any(field => !values.ContainsKey(field)))
                    throw new FixtureFault("PROOF_SCHEMA_INVALID");
                foreach (string value in values.Values)
                    if (String.IsNullOrWhiteSpace(value) || value.Length > 128) throw new FixtureFault("PROOF_VALUE_INVALID");
                if (!Regex.IsMatch(values["project"], @"\Afixture-[a-z0-9-]{1,48}\z", RegexOptions.CultureInvariant) ||
                    !Regex.IsMatch(values["host"], @"\Afixture-[a-z0-9-]{1,48}\.invalid\z", RegexOptions.CultureInvariant) ||
                    values["status"] != "ACTIVE_HEALTHY" ||
                    values["verifiedVia"] != "supabase-control-plane-get-project")
                    throw new FixtureFault("SYNTHETIC_IDENTITY_INVALID");
                string text = values["verifiedAt"];
                if (!Timestamp.IsMatch(text) ||
                    !DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTimeOffset observed))
                    throw new FixtureFault("PROOF_TIMESTAMP_INVALID");
                long ageTicks = nowUtc.UtcDateTime.Ticks - observed.UtcDateTime.Ticks;
                if (ageTicks < 0 || ageTicks > TimeSpan.FromMinutes(5).Ticks) throw new FixtureFault("PROOF_TIMESTAMP_STALE_OR_FUTURE");
            }
        }

        public static string CanonicalSyntheticProof(string json, DateTimeOffset nowUtc)
        {
            ValidateSyntheticProof(json, nowUtc);
            using JsonDocument document = JsonDocument.Parse(json);
            var values = document.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString(), StringComparer.Ordinal);
            using var stream = new MemoryStream();
            using (var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = false }))
            {
                writer.WriteStartObject();
                foreach (string field in Fields) writer.WriteString(field, values[field]);
                writer.WriteEndObject();
            }
            return new UTF8Encoding(false, true).GetString(stream.ToArray());
        }

        public static ProofCreateResult CreateOnce(FixtureScope scope, string caseName, string json,
            DateTimeOffset nowUtc, FixtureFailure failure)
        {
            string canonical;
            try { canonical = CanonicalSyntheticProof(json, nowUtc); }
            catch (FixtureFault fault) { return new ProofCreateResult { Status = "REJECTED_BEFORE_CREATE", Code = fault.Code, CreateAttempts = 0 }; }
            List<SafeFileHandle> chain = null;
            FileStream output = null;
            int attempts = 0;
            bool created = false;
            byte[] bytes = new UTF8Encoding(false, true).GetBytes(canonical);
            try
            {
                string path = scope.FilePath(caseName, ProofLeaf);
                chain = FixturePath.HoldDirectoryChain(scope.FullCasePath(caseName), scope.RootPath);
                if (failure == FixtureFailure.BeforeProofCreate)
                    return new ProofCreateResult { Status = "STOPPED_BEFORE_CREATE", Code = "INJECTED_STOP", CreateAttempts = 0 };
                attempts = 1;
                try
                {
                    output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 4096, FileOptions.WriteThrough);
                    created = true;
                }
                catch (IOException ex) when ((ex.HResult & 0xffff) == 80)
                {
                    return new ProofCreateResult { Status = "REJECTED_EXISTING_FILE", Code = "CREATE_NEW_COLLISION", CreateAttempts = attempts };
                }
                if (failure == FixtureFailure.AfterProofCreate)
                    return new ProofCreateResult { Status = "UNRESOLVED_AFTER_CREATE", Code = "INJECTED_AFTER_CREATE", CreateAttempts = attempts };
                if (failure == FixtureFailure.AfterProofPartialWrite)
                {
                    int partial = Math.Max(1, bytes.Length / 2);
                    output.Write(bytes, 0, partial);
                    output.Flush(true);
                    return new ProofCreateResult { Status = "UNRESOLVED_AFTER_CREATE", Code = "INJECTED_AFTER_PARTIAL_WRITE", CreateAttempts = attempts };
                }
                output.Write(bytes, 0, bytes.Length);
                output.Flush(true);
                if (failure == FixtureFailure.AfterProofFlush)
                    return new ProofCreateResult { Status = "UNRESOLVED_AFTER_CREATE", Code = "INJECTED_AFTER_FLUSH", CreateAttempts = attempts };
                output.Dispose();
                output = null;
                byte[] actual = File.ReadAllBytes(path);
                if (!actual.SequenceEqual(bytes))
                    return new ProofCreateResult { Status = "UNRESOLVED_AFTER_CREATE", Code = "PROOF_READBACK_MISMATCH", CreateAttempts = attempts };
                return new ProofCreateResult { Status = "CREATED_AND_VERIFIED", Code = "OK", CreateAttempts = attempts,
                    Bytes = actual.Length, Sha256 = Convert.ToHexString(SHA256.HashData(actual)).ToLowerInvariant() };
            }
            catch
            {
                return new ProofCreateResult { Status = created ? "UNRESOLVED_AFTER_CREATE" : "STOPPED_BEFORE_CREATE",
                    Code = created ? "PROOF_CREATE_STATE_UNRESOLVED" : "PROOF_CREATE_BLOCKED", CreateAttempts = attempts };
            }
            finally
            {
                if (output != null) output.Dispose();
                FixturePath.Release(chain);
            }
        }
    }

    public sealed class RaceSummary
    {
        public string WinnerStatus { get; internal set; }
        public string LoserStatus { get; internal set; }
        public int TotalSubmissions { get; internal set; }
        public bool DestinationMatchesWinner { get; internal set; }
        public bool LosingSourceRetained { get; internal set; }
    }

    // Test-only concurrency helper. Both operations are prepared before either is released.
    public static class FixtureRaceTest
    {
        public static RaceSummary Run(FixtureScope scope)
        {
            scope.CreateCase("race");
            scope.WriteNewFile("race", "source-a.bin", Encoding.ASCII.GetBytes("source-A"));
            scope.WriteNewFile("race", "source-b.bin", Encoding.ASCII.GetBytes("source-B"));
            SourceBinding a = ArchiveFixtureOps.Capture(scope, "race", "source-a.bin");
            SourceBinding b = ArchiveFixtureOps.Capture(scope, "race", "source-b.bin");
            using (PreparedArchive opA = ArchiveFixtureOps.Prepare(scope, "race", "source-a.bin", "archive.bin", a))
            using (PreparedArchive opB = ArchiveFixtureOps.Prepare(scope, "race", "source-b.bin", "archive.bin", b))
            using (var ready = new CountdownEvent(2))
            using (var start = new ManualResetEventSlim(false))
            {
                ArchiveResult ra = null, rb = null;
                var ta = System.Threading.Tasks.Task.Run(() => { ready.Signal(); start.Wait(); ra = opA.SubmitAndVerify(FixtureFailure.None); });
                var tb = System.Threading.Tasks.Task.Run(() => { ready.Signal(); start.Wait(); rb = opB.SubmitAndVerify(FixtureFailure.None); });
                if (!ready.Wait(TimeSpan.FromSeconds(10))) throw new FixtureFault("RACE_READY_TIMEOUT");
                start.Set();
                if (!System.Threading.Tasks.Task.WaitAll(new[] { ta, tb }, TimeSpan.FromSeconds(10)))
                    throw new FixtureFault("RACE_COMPLETION_TIMEOUT");
                int winners = (ra.Status == "ARCHIVED_AND_VERIFIED" ? 1 : 0) + (rb.Status == "ARCHIVED_AND_VERIFIED" ? 1 : 0);
                ArchiveResult winner = ra.Status == "ARCHIVED_AND_VERIFIED" ? ra : rb;
                bool loserA = ra.Status != "ARCHIVED_AND_VERIFIED";
                bool losingSourceRetained = loserA ? File.Exists(scope.FilePath("race", "source-a.bin")) :
                    File.Exists(scope.FilePath("race", "source-b.bin"));
                bool destMatchesWinner = File.Exists(scope.FilePath("race", "archive.bin")) &&
                    File.ReadAllText(scope.FilePath("race", "archive.bin"), Encoding.ASCII) ==
                    (winner == ra ? "source-A" : "source-B");
                if (winners != 1 || !destMatchesWinner || !losingSourceRetained)
                    throw new FixtureFault("RACE_POSTCONDITION_FAILED");
                return new RaceSummary { WinnerStatus = winner.Status,
                    LoserStatus = winner == ra ? rb.Status : ra.Status,
                    TotalSubmissions = opA.Submissions + opB.Submissions,
                    DestinationMatchesWinner = destMatchesWinner, LosingSourceRetained = losingSourceRetained };
            }
        }
    }
}
