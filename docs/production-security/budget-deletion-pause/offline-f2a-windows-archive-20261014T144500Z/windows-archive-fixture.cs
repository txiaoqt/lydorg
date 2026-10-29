// OFFLINE F2-A FIXTURE LIBRARY ONLY. No production adapter or executable entrypoint.
// Only the hard-coded candidate fixture tree is admitted. No protected-state binding.
// Win32 x64 FILE_RENAME_INFO (class 3), ReplaceIfExists = FALSE, held parent handle.
// No MoveFileEx, copy, delete, cleanup, restore, alternate primitive, or retry.
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace YTraceF2A {
    public sealed class ArchiveFault : Exception {
        public readonly string Code;
        public ArchiveFault(string code) : base(code) { Code = code; }
    }
    public sealed class FileBinding {
        public string DirectoryId { get; internal set; }
        public string SourceId { get; internal set; }
        public string Sha256 { get; internal set; }
        public long Bytes { get; internal set; }
        public long Creation { get; internal set; }
        public long LastWrite { get; internal set; }
    }
    public sealed class ArchiveResult {
        public string Status { get; internal set; }
        public int NativeError { get; internal set; }
        public int Submissions { get; internal set; }
    }
    internal static class Native {
        internal const uint Read = 0x80000000, Delete = 0x00010000, Attributes = 0x80;
        internal const uint ShareRead = 1, ShareAll = 7, OpenExisting = 3;
        internal const uint Backup = 0x02000000, OpenReparse = 0x00200000;
        internal const uint Directory = 0x10, Reparse = 0x400;
        [StructLayout(LayoutKind.Sequential)]
        internal struct Time { internal uint Low; internal uint High;
            internal long Value { get { return ((long)High << 32) | Low; } } }
        [StructLayout(LayoutKind.Sequential)]
        internal struct Info {
            internal uint Attributes; internal Time Creation, Access, Write;
            internal uint Volume, SizeHigh, SizeLow, Links, IndexHigh, IndexLow;
            internal string Id { get { return Volume.ToString("x8")+":"+IndexHigh.ToString("x8")+IndexLow.ToString("x8"); } }
            internal long Size { get { return ((long)SizeHigh << 32) | SizeLow; } }
        }
        [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
        internal static extern SafeFileHandle CreateFileW(string name, uint access, uint share,
            IntPtr security, uint creation, uint flags, IntPtr template);
        [DllImport("kernel32.dll", SetLastError=true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool GetFileInformationByHandle(SafeFileHandle handle, out Info info);
        [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
        internal static extern uint GetFinalPathNameByHandleW(SafeFileHandle handle, StringBuilder path, uint size, uint flags);
        [DllImport("kernel32.dll", SetLastError=true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool SetFileInformationByHandle(SafeFileHandle handle, int infoClass, IntPtr info, uint size);
        [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
        internal static extern uint GetFileAttributesW(string path);
        internal static Info Inspect(SafeFileHandle h) {
            Info info;
            if (!GetFileInformationByHandle(h, out info)) throw new ArchiveFault("HANDLE_INFO_FAILED");
            return info;
        }
        internal static string Final(SafeFileHandle h) {
            var text = new StringBuilder(32768);
            uint count = GetFinalPathNameByHandleW(h, text, (uint)text.Capacity, 0);
            if (count == 0 || count >= text.Capacity) throw new ArchiveFault("FINAL_PATH_FAILED");
            string result = text.ToString();
            if (!result.StartsWith(@"\\?\", StringComparison.Ordinal)) throw new ArchiveFault("FINAL_PATH_NAMESPACE");
            return result.Substring(4).TrimEnd('\\');
        }
    }
    public static class FixtureArchive {
        public const string FixtureRoot = @"C:\Users\Christopher x Angel\Documents\lydo-connect-org-focused\docs\production-security\budget-deletion-pause\offline-f2a-windows-archive-20261014T144500Z\fixtures";
        internal static void Need(bool condition, string code) { if (!condition) throw new ArchiveFault(code); }
        internal static string DirectoryPath(string input) {
            Need(OperatingSystem.IsWindows() && IntPtr.Size == 8, "WINDOWS_X64_REQUIRED");
            Need(input != null && input.StartsWith(FixtureRoot+"\\", StringComparison.OrdinalIgnoreCase), "FIXTURE_ROOT_ONLY");
            Need(!input.Contains('/') && !input.Contains('\0'), "NONCANONICAL_PATH");
            string full = Path.GetFullPath(input);
            Need(String.Equals(full, input, StringComparison.OrdinalIgnoreCase), "NONCANONICAL_PATH");
            foreach (string piece in input.Substring(3).Split('\\')) {
                Need(piece.Length > 0 && piece != "." && piece != ".." &&
                    !piece.EndsWith(".") && !piece.EndsWith(" ") && !piece.Contains(':'), "UNSAFE_COMPONENT");
            }
            return full;
        }
        internal static void Leaf(string leaf) {
            Need(leaf != null && Regex.IsMatch(leaf, @"\A[A-Za-z0-9][A-Za-z0-9_.-]{0,63}\z") &&
                !leaf.EndsWith(".") && !Regex.IsMatch(leaf, @"\A(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\.|\z)", RegexOptions.IgnoreCase),
                "UNSAFE_LEAF");
        }
        internal static List<SafeFileHandle> HoldChain(string dir) {
            var held = new List<SafeFileHandle>();
            try {
                string current = Path.GetPathRoot(dir);
                var pieces = new List<string> { current };
                foreach (string piece in dir.Substring(current.Length).Split('\\')) {
                    current = Path.Combine(current, piece); pieces.Add(current);
                }
                foreach (string path in pieces) {
                    var handle = Native.CreateFileW(path, Native.Attributes, Native.ShareRead,
                        IntPtr.Zero, Native.OpenExisting, Native.Backup|Native.OpenReparse, IntPtr.Zero);
                    if (handle.IsInvalid) { handle.Dispose(); throw new ArchiveFault("DIRECTORY_OPEN_FAILED"); }
                    held.Add(handle);
                    var info = Native.Inspect(handle);
                    Need((info.Attributes & Native.Directory) != 0, "DIRECTORY_REQUIRED");
                    Need((info.Attributes & Native.Reparse) == 0, "REPARSE_DIRECTORY_REJECTED");
                    Need(String.Equals(Native.Final(handle), path.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase),
                        "DIRECTORY_FINAL_PATH_MISMATCH");
                }
                return held;
            } catch { Release(held); throw; }
        }
        internal static void Release(List<SafeFileHandle> handles) {
            for (int i=handles.Count-1; i>=0; i--) handles[i].Dispose();
        }
        internal static SafeFileHandle OpenSource(string path, bool forRename) {
            var h = Native.CreateFileW(path, Native.Read|(forRename?Native.Delete:0), forRename?Native.ShareRead:Native.ShareAll,
                IntPtr.Zero, Native.OpenExisting, Native.OpenReparse, IntPtr.Zero);
            if (h.IsInvalid) { h.Dispose(); throw new ArchiveFault("SOURCE_OPEN_FAILED"); }
            try {
                var info = Native.Inspect(h);
                Need((info.Attributes & (Native.Directory|Native.Reparse)) == 0, "REGULAR_SOURCE_REQUIRED");
                Need(info.Links == 1, "HARDLINK_SOURCE_REJECTED");
                Need(info.Size >= 0 && info.Size <= 65536, "FIXTURE_SIZE_BOUND");
                Need(String.Equals(Native.Final(h), path, StringComparison.OrdinalIgnoreCase), "SOURCE_FINAL_PATH_MISMATCH");
                return h;
            } catch { h.Dispose(); throw; }
        }
        internal static string Hash(FileStream stream) {
            stream.Position=0;
            return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
        }
        public static FileBinding Capture(string directory, string sourceLeaf) {
            string dir = DirectoryPath(directory); Leaf(sourceLeaf);
            var chain = HoldChain(dir);
            try {
                using (var h = OpenSource(Path.Combine(dir, sourceLeaf), true))
                using (var stream = new FileStream(h, FileAccess.Read)) {
                    var info = Native.Inspect(h);
                    return new FileBinding { DirectoryId=Native.Inspect(chain[chain.Count-1]).Id, SourceId=info.Id,
                        Sha256=Hash(stream), Bytes=info.Size, Creation=info.Creation.Value, LastWrite=info.Write.Value };
                }
            } finally { Release(chain); }
        }
        public static PreparedArchive Prepare(string directory, string sourceLeaf, string destinationLeaf, FileBinding expected) {
            string dir = DirectoryPath(directory); Leaf(sourceLeaf); Leaf(destinationLeaf);
            Need(!String.Equals(sourceLeaf,destinationLeaf,StringComparison.OrdinalIgnoreCase), "SAME_LEAF_REJECTED");
            Need(expected != null, "BINDING_REQUIRED");
            return new PreparedArchive(dir,sourceLeaf,destinationLeaf,expected);
        }
        public static ArchiveResult ArchiveOnce(string directory, string sourceLeaf, string destinationLeaf, FileBinding expected) {
            using (var operation=Prepare(directory,sourceLeaf,destinationLeaf,expected)) {
                operation.SubmitOnce(); return operation.VerifySubmitted();
            }
        }
    }
    public sealed class PreparedArchive : IDisposable {
        private readonly string dir, source, destination;
        private readonly FileBinding expected;
        private readonly List<SafeFileHandle> chain;
        private readonly SafeFileHandle handle;
        private readonly FileStream stream;
        private int submitted, nativeError; private bool nativeOk;
        public int Submissions { get { return Volatile.Read(ref submitted); } }
        internal PreparedArchive(string directory,string sourceLeaf,string destinationLeaf,FileBinding binding) {
            dir=directory; source=Path.Combine(dir,sourceLeaf); destination=Path.Combine(dir,destinationLeaf);
            // Freeze the binding. Caller mutation cannot change the admitted source.
            expected=new FileBinding { DirectoryId=binding.DirectoryId, SourceId=binding.SourceId, Sha256=binding.Sha256,
                Bytes=binding.Bytes, Creation=binding.Creation, LastWrite=binding.LastWrite };
            chain=FixtureArchive.HoldChain(dir);
            try {
                FixtureArchive.Need(Native.Inspect(chain[chain.Count-1]).Id == expected.DirectoryId, "DIRECTORY_IDENTITY_CHANGED");
                handle=FixtureArchive.OpenSource(source,true);
                stream=new FileStream(handle,FileAccess.Read);
                MatchSource();
            } catch {
                if (stream != null) stream.Dispose();
                if (handle != null) handle.Dispose();
                FixtureArchive.Release(chain); throw;
            }
        }
        private void MatchSource() {
            var info=Native.Inspect(handle);
            FixtureArchive.Need(info.Id==expected.SourceId, "SOURCE_IDENTITY_CHANGED");
            FixtureArchive.Need(info.Links==1 && info.Size==expected.Bytes &&
                info.Creation.Value==expected.Creation && info.Write.Value==expected.LastWrite &&
                FixtureArchive.Hash(stream)==expected.Sha256, "SOURCE_CONTENT_OR_METADATA_CHANGED");
        }
        // Exposed only to the synthetic crash harness; this candidate supplies no production entrypoint.
        // A second call on this object is rejected before touching the filesystem.
        public int SubmitOnce() {
            FixtureArchive.Need(Interlocked.CompareExchange(ref submitted,1,0)==0, "SUBMISSION_ALREADY_CONSUMED");
            MatchSource();
            FixtureArchive.Need(String.Equals(Native.Final(handle),source,StringComparison.OrdinalIgnoreCase), "SOURCE_MOVED_BEFORE_SUBMISSION");
            FixtureArchive.Need(String.Equals(Native.Final(chain[chain.Count-1]),dir,StringComparison.OrdinalIgnoreCase), "DIRECTORY_MOVED_BEFORE_SUBMISSION");
            // x64 FILE_RENAME_INFO: BOOLEAN/union at 0, RootDirectory at 8, FileNameLength at 16, UTF16 name at 20.
            byte[] name=Encoding.Unicode.GetBytes(Path.GetFileName(destination));
            int length=Math.Max(32,20+name.Length+2);
            IntPtr buffer=Marshal.AllocHGlobal(length);
            try {
                Marshal.Copy(new byte[length],0,buffer,length);
                Marshal.WriteInt32(buffer,0,0); // ReplaceIfExists FALSE. No replace, POSIX, or copy flags.
                Marshal.WriteIntPtr(buffer,8,chain[chain.Count-1].DangerousGetHandle());
                Marshal.WriteInt32(buffer,16,name.Length);
                Marshal.Copy(name,0,IntPtr.Add(buffer,20),name.Length);
                nativeOk=Native.SetFileInformationByHandle(handle,3,buffer,(uint)length);
                nativeError=nativeOk?0:Marshal.GetLastWin32Error();
                return nativeError;
            } finally { Marshal.FreeHGlobal(buffer); }
        }
        public ArchiveResult VerifySubmitted() {
            FixtureArchive.Need(Submissions==1,"NO_SUBMISSION");
            try {
                MatchSource();
                if (!nativeOk) {
                    FixtureArchive.Need(String.Equals(Native.Final(handle),source,StringComparison.OrdinalIgnoreCase), "FAILURE_SOURCE_UNRESOLVED");
                    return new ArchiveResult { Status=(nativeError==80||nativeError==183)?"REJECTED_DESTINATION_EXISTS":"UNRESOLVED_NATIVE_FAILURE",
                        NativeError=nativeError,Submissions=1 };
                }
                FixtureArchive.Need(String.Equals(Native.Final(handle),destination,StringComparison.OrdinalIgnoreCase),"ARCHIVE_FINAL_PATH_MISMATCH");
                using (var archived=FixtureArchive.OpenSource(destination,false)) {
                    FixtureArchive.Need(Native.Inspect(archived).Id==expected.SourceId,"ARCHIVE_IDENTITY_MISMATCH");
                }
                uint attrs=Native.GetFileAttributesW(source);
                int error=Marshal.GetLastWin32Error();
                FixtureArchive.Need(attrs==UInt32.MaxValue && error==2,"SOURCE_ABSENCE_UNRESOLVED");
                return new ArchiveResult { Status="ARCHIVED_AND_VERIFIED",NativeError=0,Submissions=1 };
            } catch (ArchiveFault) {
                return new ArchiveResult { Status="UNRESOLVED_AFTER_SUBMISSION",NativeError=nativeError,Submissions=1 };
            } catch (IOException) {
                return new ArchiveResult { Status="UNRESOLVED_AFTER_SUBMISSION",NativeError=nativeError,Submissions=1 };
            }
        }
        // Close handles only. Dispose never removes, restores, repairs, or retries any filesystem entry.
        public void Dispose() {
            if(stream!=null) stream.Dispose();
            if(handle!=null) handle.Dispose();
            FixtureArchive.Release(chain);
        }
    }
}
