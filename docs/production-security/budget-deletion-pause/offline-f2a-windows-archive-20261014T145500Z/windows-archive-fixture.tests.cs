// Actual Windows filesystem tests only; all paths are under FixtureArchive.FixtureRoot.
// No network, environment/credential reads, production imports, protected state, or cleanup.
using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace YTraceF2A {
    public static class FixtureTests {
        private static int total, passed, failed;
        public static readonly string Session=Path.Combine(FixtureArchive.FixtureRoot,"session-01");
        private const string Original="SYNTHETIC F2A SOURCE BYTES\n";
        public static int Total { get { return total; } }
        public static int Passed { get { return passed; } }
        public static int Failed { get { return failed; } }
        public static void Check(bool value,string code) { if(!value) throw new ArchiveFault(code); }
        public static void Case(string name,Action test) {
            total++;
            try { test(); passed++; Console.WriteLine("ok "+total+" - "+name); }
            catch(Exception ex) {
                failed++;
                var fault=ex as ArchiveFault;
                string code=fault!=null?fault.Code:ex.GetType().Name;
                Console.WriteLine("not ok "+total+" - "+name+" # "+code);
            }
        }
        private static string Dir(string leaf) {
            string path=Path.Combine(Session,leaf);
            Check(!Directory.Exists(path) && !File.Exists(path),"FIXTURE_ALREADY_EXISTS");
            Directory.CreateDirectory(path); return path;
        }
        public static void Write(string path,string value) {
            byte[] bytes=Encoding.UTF8.GetBytes(value);
            using(var stream=new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.None)) {
                stream.Write(bytes,0,bytes.Length); stream.Flush(true);
            }
        }
        private static void Text(string path,string value) { Check(File.ReadAllText(path)==value,"BYTES_NOT_PRESERVED"); }
        private static void Rejected(Action action,string code) {
            bool matched=false;
            try { action(); } catch(ArchiveFault fault) { matched=fault.Code==code; }
            Check(matched,"EXPECTED_"+code);
        }
        private static void Archived(ArchiveResult result) {
            Check(result.Status=="ARCHIVED_AND_VERIFIED" && result.NativeError==0 && result.Submissions==1,"ARCHIVE_NOT_VERIFIED_"+result.NativeError);
        }
        public static void RunMainCases() {
            Check(!Directory.Exists(FixtureArchive.FixtureRoot),"FIXTURE_ROOT_ALREADY_EXISTS");
            Directory.CreateDirectory(Session);
            Case("actual same-directory Win32 rename preserves file ID, bytes and timestamps",()=>{
                string dir=Dir("normal");
                Write(Path.Combine(dir,"source.bin"),Original);
                var before=FixtureArchive.Capture(dir,"source.bin");
                var result=FixtureArchive.ArchiveOnce(dir,"source.bin","archive.bin",before);
                Archived(result);
                var after=FixtureArchive.Capture(dir,"archive.bin");
                Check(before.SourceId==after.SourceId && before.Sha256==after.Sha256 &&
                    before.Creation==after.Creation && before.LastWrite==after.LastWrite,"NATIVE_IDENTITY_OR_TIMES_CHANGED");
                Check(!File.Exists(Path.Combine(dir,"source.bin")),"SOURCE_STILL_PRESENT");
                Text(Path.Combine(dir,"archive.bin"),Original);
                Console.WriteLine("# native FileRenameInfo=3 replace=FALSE error="+result.NativeError);
            });
            // Each iteration is a distinct fixture and deliberate independent race, never a retry.
            for(int i=0;i<16;i++) {
                int race=i;
                Case("two concurrent kernel contenders / unique fixture "+race,()=>{
                    string dir=Dir("race-"+race.ToString("D2"));
                    string a="SYNTHETIC CONTENDER A "+race, b="SYNTHETIC CONTENDER B "+race;
                    Write(Path.Combine(dir,"source-a.bin"),a); Write(Path.Combine(dir,"source-b.bin"),b);
                    var ba=FixtureArchive.Capture(dir,"source-a.bin");
                    var bb=FixtureArchive.Capture(dir,"source-b.bin");
                    using(var oa=FixtureArchive.Prepare(dir,"source-a.bin","archive.bin",ba))
                    using(var ob=FixtureArchive.Prepare(dir,"source-b.bin","archive.bin",bb))
                    using(var barrier=new Barrier(3)) {
                        Func<PreparedArchive,ArchiveResult> run=(op)=>{
                            Check(barrier.SignalAndWait(TimeSpan.FromSeconds(10)),"CONTENDER_BARRIER_TIMEOUT");
                            op.SubmitOnce(); return op.VerifySubmitted();
                        };
                        var ta=Task.Run(()=>run(oa)); var tb=Task.Run(()=>run(ob));
                        Check(barrier.SignalAndWait(TimeSpan.FromSeconds(10)),"PARENT_BARRIER_TIMEOUT");
                        Check(Task.WaitAll(new Task[]{ta,tb},TimeSpan.FromSeconds(10)),"CONTENDER_TIMEOUT");
                        var ra=ta.Result; var rb=tb.Result;
                        bool aw=ra.Status=="ARCHIVED_AND_VERIFIED",bw=rb.Status=="ARCHIVED_AND_VERIFIED";
                        Check(aw^bw,"NOT_EXACTLY_ONE_WINNER");
                        var loser=aw?rb:ra;
                        Check(loser.Status=="REJECTED_DESTINATION_EXISTS" && (loser.NativeError==80||loser.NativeError==183),"LOSER_NOT_NO_OVERWRITE");
                        Check(ra.Submissions==1 && rb.Submissions==1,"CONTENDER_SUBMISSION_COUNT");
                        Text(Path.Combine(dir,"archive.bin"),aw?a:b);
                        Text(Path.Combine(dir,aw?"source-b.bin":"source-a.bin"),aw?b:a);
                        Check(!File.Exists(Path.Combine(dir,aw?"source-a.bin":"source-b.bin")),"WINNER_SOURCE_REMAINS");
                        Check(FixtureArchive.Capture(dir,"archive.bin").SourceId==(aw?ba.SourceId:bb.SourceId),"DESTINATION_NOT_WINNER_INODE");
                        Console.WriteLine("# race="+race+" winner="+(aw?"A":"B")+" loserWin32="+loser.NativeError+" submissions=2");
                    }
                });
            }
            Case("preexisting destination rejected and both file identities/bytes retained",()=>{
                string dir=Dir("preexisting");
                Write(Path.Combine(dir,"source.bin"),Original);
                Write(Path.Combine(dir,"archive.bin"),"SYNTHETIC EXISTING DESTINATION");
                var before=FixtureArchive.Capture(dir,"source.bin");
                var dest=FixtureArchive.Capture(dir,"archive.bin");
                var result=FixtureArchive.ArchiveOnce(dir,"source.bin","archive.bin",before);
                Check(result.Status=="REJECTED_DESTINATION_EXISTS" && result.Submissions==1,"DESTINATION_OVERWRITE_NOT_REJECTED");
                Check(FixtureArchive.Capture(dir,"source.bin").SourceId==before.SourceId,"SOURCE_ID_LOST");
                Check(FixtureArchive.Capture(dir,"archive.bin").SourceId==dest.SourceId,"DESTINATION_ID_REPLACED");
                Text(Path.Combine(dir,"source.bin"),Original);
                Text(Path.Combine(dir,"archive.bin"),"SYNTHETIC EXISTING DESTINATION");
            });
            Case("destination appearing after handle preparation is rejected by kernel",()=>{
                string dir=Dir("late-destination"); Write(Path.Combine(dir,"source.bin"),Original);
                var before=FixtureArchive.Capture(dir,"source.bin");
                using(var op=FixtureArchive.Prepare(dir,"source.bin","archive.bin",before)) {
                    Write(Path.Combine(dir,"archive.bin"),"SYNTHETIC LATE DESTINATION");
                    op.SubmitOnce(); var result=op.VerifySubmitted();
                    Check(result.Status=="REJECTED_DESTINATION_EXISTS","LATE_DESTINATION_OVERWRITTEN");
                    Text(Path.Combine(dir,"source.bin"),Original);
                    Text(Path.Combine(dir,"archive.bin"),"SYNTHETIC LATE DESTINATION");
                }
            });
            Case("source pathname replacement after capture rejects changed identity",()=>{
                string dir=Dir("source-substitution"); Write(Path.Combine(dir,"source.bin"),Original);
                var before=FixtureArchive.Capture(dir,"source.bin");
                File.Move(Path.Combine(dir,"source.bin"),Path.Combine(dir,"original-retained.bin"));
                Write(Path.Combine(dir,"source.bin"),Original);
                Rejected(()=>FixtureArchive.ArchiveOnce(dir,"source.bin","archive.bin",before),"SOURCE_IDENTITY_CHANGED");
                Text(Path.Combine(dir,"original-retained.bin"),Original); Text(Path.Combine(dir,"source.bin"),Original);
                Check(!File.Exists(Path.Combine(dir,"archive.bin")),"SUBSTITUTED_SOURCE_RENAMED");
            });
            Case("directory pathname replacement after capture rejects changed identity",()=>{
                string dir=Dir("directory-substitution"); Write(Path.Combine(dir,"source.bin"),Original);
                var before=FixtureArchive.Capture(dir,"source.bin");
                Directory.Move(dir,dir+"-retained");
                Directory.CreateDirectory(dir); Write(Path.Combine(dir,"source.bin"),Original);
                Rejected(()=>FixtureArchive.ArchiveOnce(dir,"source.bin","archive.bin",before),"DIRECTORY_IDENTITY_CHANGED");
                Text(Path.Combine(dir+"-retained","source.bin"),Original); Text(Path.Combine(dir,"source.bin"),Original);
                Check(!File.Exists(Path.Combine(dir,"archive.bin")),"SUBSTITUTED_DIRECTORY_USED");
            });
            Case("same-file content change after capture rejects changed bytes",()=>{
                string dir=Dir("content-change"); Write(Path.Combine(dir,"source.bin"),Original);
                var before=FixtureArchive.Capture(dir,"source.bin");
                File.WriteAllText(Path.Combine(dir,"source.bin"),"SYNTHETIC CHANGED BY OTHER TEST ACTOR");
                Rejected(()=>FixtureArchive.ArchiveOnce(dir,"source.bin","archive.bin",before),"SOURCE_CONTENT_OR_METADATA_CHANGED");
                Text(Path.Combine(dir,"source.bin"),"SYNTHETIC CHANGED BY OTHER TEST ACTOR");
                Check(!File.Exists(Path.Combine(dir,"archive.bin")),"CHANGED_BYTES_RENAMED");
            });
            Case("held parent/source handles reject move and write interference",()=>{
                string dir=Dir("held-handles"); Write(Path.Combine(dir,"source.bin"),Original);
                var before=FixtureArchive.Capture(dir,"source.bin");
                using(var op=FixtureArchive.Prepare(dir,"source.bin","archive.bin",before)) {
                    bool parentBlocked=false,sourceBlocked=false,writeBlocked=false;
                    try { Directory.Move(dir,dir+"-unexpected"); } catch(IOException) { parentBlocked=true; }
                    try { File.Move(Path.Combine(dir,"source.bin"),Path.Combine(dir,"unexpected.bin")); } catch(IOException) { sourceBlocked=true; }
                    try { using(var writer=new FileStream(Path.Combine(dir,"source.bin"),FileMode.Open,FileAccess.Write,FileShare.ReadWrite|FileShare.Delete)){} }
                    catch(IOException) { writeBlocked=true; }
                    Check(parentBlocked && sourceBlocked && writeBlocked,"HELD_HANDLE_INTERFERENCE_NOT_BLOCKED");
                    op.SubmitOnce(); Archived(op.VerifySubmitted());
                }
                Text(Path.Combine(dir,"archive.bin"),Original);
            });
            Case("one prepared operation cannot submit twice, including after rejection",()=>{
                string dir=Dir("one-submission"); Write(Path.Combine(dir,"source.bin"),Original);
                Write(Path.Combine(dir,"archive.bin"),"SYNTHETIC EXISTING");
                var before=FixtureArchive.Capture(dir,"source.bin");
                using(var op=FixtureArchive.Prepare(dir,"source.bin","archive.bin",before)) {
                    op.SubmitOnce(); Check(op.VerifySubmitted().Status=="REJECTED_DESTINATION_EXISTS","FIRST_RESULT");
                    Rejected(()=>op.SubmitOnce(),"SUBMISSION_ALREADY_CONSUMED");
                    Check(op.Submissions==1,"RETRY_COUNT_CHANGED");
                }
                Text(Path.Combine(dir,"source.bin"),Original); Text(Path.Combine(dir,"archive.bin"),"SYNTHETIC EXISTING");
            });
            Case("fixture root, traversal, alternate stream and same-leaf inputs fail before rename",()=>{
                string dir=Dir("unsafe-inputs"); Write(Path.Combine(dir,"archive.bin"),Original);
                Rejected(()=>FixtureArchive.Capture(@"C:\not-an-admitted-fixture","source.bin"),"FIXTURE_ROOT_ONLY");
                Rejected(()=>FixtureArchive.Capture(dir+@"\..\normal","archive.bin"),"NONCANONICAL_PATH");
                Rejected(()=>FixtureArchive.Capture(dir,"archive.bin:stream"),"UNSAFE_LEAF");
                var before=FixtureArchive.Capture(dir,"archive.bin");
                Rejected(()=>FixtureArchive.ArchiveOnce(dir,"archive.bin","ARCHIVE.BIN",before),"SAME_LEAF_REJECTED");
            });
        }
        public static void RunDirectoryDestinationCase() {
            Case("preexisting directory destination rejected without replacing directory or source",()=>{
                string dir=Dir("directory-destination"); Write(Path.Combine(dir,"source.bin"),Original);
                Directory.CreateDirectory(Path.Combine(dir,"archive.bin"));
                Write(Path.Combine(dir,"archive.bin","sentinel.bin"),"SYNTHETIC RETAINED DIRECTORY");
                var before=FixtureArchive.Capture(dir,"source.bin");
                var result=FixtureArchive.ArchiveOnce(dir,"source.bin","archive.bin",before);
                Check(result.Status!="ARCHIVED_AND_VERIFIED","DIRECTORY_DESTINATION_REPLACED");
                Text(Path.Combine(dir,"source.bin"),Original);
                Text(Path.Combine(dir,"archive.bin","sentinel.bin"),"SYNTHETIC RETAINED DIRECTORY");
                Console.WriteLine("# existing directory nativeError="+result.NativeError+" status="+result.Status);
            });
        }
        public static void PrepareProcessRace() {
            string dir=Dir("process-race");
            Write(Path.Combine(dir,"source-a.bin"),"SYNTHETIC PROCESS A");
            Write(Path.Combine(dir,"source-b.bin"),"SYNTHETIC PROCESS B");
        }
        public static void RaceChildOnly(string contender) {
            Check(contender=="A"||contender=="B","FIXED_CONTENDER_ONLY");
            string dir=Path.Combine(Session,"process-race");
            string leaf=contender=="A"?"source-a.bin":"source-b.bin";
            var before=FixtureArchive.Capture(dir,leaf);
            using(var op=FixtureArchive.Prepare(dir,leaf,"archive.bin",before)) {
                Console.WriteLine("READY"); Console.Out.Flush();
                Check(Console.ReadLine()=="GO","FIXED_RACE_GO_REQUIRED");
                op.SubmitOnce(); var result=op.VerifySubmitted();
                Console.WriteLine(result.Status+"|"+result.NativeError+"|"+result.Submissions);
                Console.Out.Flush();
            }
        }
        public static void CheckProcessRace(string first,string second) {
            Case("two actual child processes contend for the same destination",()=>{
                bool a=first=="ARCHIVED_AND_VERIFIED|0|1",b=second=="ARCHIVED_AND_VERIFIED|0|1";
                Check(a^b,"PROCESS_RACE_NOT_ONE_WINNER");
                string loser=a?second:first;
                Check(loser=="REJECTED_DESTINATION_EXISTS|183|1" || loser=="REJECTED_DESTINATION_EXISTS|80|1","PROCESS_RACE_LOSER_NOT_COLLISION");
                string dir=Path.Combine(Session,"process-race");
                Text(Path.Combine(dir,"archive.bin"),a?"SYNTHETIC PROCESS A":"SYNTHETIC PROCESS B");
                Text(Path.Combine(dir,a?"source-b.bin":"source-a.bin"),a?"SYNTHETIC PROCESS B":"SYNTHETIC PROCESS A");
                Check(!File.Exists(Path.Combine(dir,a?"source-a.bin":"source-b.bin")),"PROCESS_RACE_WINNER_SOURCE_REMAINS");
                Console.WriteLine("# independentProcesses=2 dispatches=2 winner="+(a?"A":"B")+" loser="+loser);
            });
        }
        public static FileBinding PrepareHardlinkFixture() {
            string dir=Dir("hardlink-source"); Write(Path.Combine(dir,"source.bin"),Original);
            return FixtureArchive.Capture(dir,"source.bin");
        }
        public static void CheckHardlink(FileBinding binding) {
            Case("actual source hardlink rejected and both names retained",()=>{
                string dir=Path.Combine(Session,"hardlink-source");
                Rejected(()=>FixtureArchive.ArchiveOnce(dir,"source.bin","archive.bin",binding),"HARDLINK_SOURCE_REJECTED");
                Text(Path.Combine(dir,"source.bin"),Original); Text(Path.Combine(dir,"alias.bin"),Original);
                Check(!File.Exists(Path.Combine(dir,"archive.bin")),"HARDLINK_RENAMED");
            });
        }
        public static void PrepareCrashFixture() {
            string dir=Dir("crash-after-kernel"); Write(Path.Combine(dir,"source.bin"),Original);
        }
        public static void CrashChildOnly() {
            string dir=Path.Combine(Session,"crash-after-kernel");
            var before=FixtureArchive.Capture(dir,"source.bin");
            using(var op=FixtureArchive.Prepare(dir,"source.bin","archive.bin",before)) {
                int error=op.SubmitOnce();
                if(error!=0) { Console.WriteLine("CHILD_NATIVE_REJECTED_"+error); Environment.Exit(74); }
                Console.WriteLine("CHILD_NATIVE_RENAME_SUCCEEDED_NO_VERIFIED_RECEIPT");
                Console.Out.Flush();
                Environment.Exit(73); // Abrupt process exit before VerifySubmitted. No cleanup/restore/retry.
            }
        }
        public static void CheckCrashResult(int exitCode,string childOutput) {
            Case("real child exit after kernel rename is unresolved; retained archive and no resubmit",()=>{
                Check(exitCode==73 && childOutput.Trim()=="CHILD_NATIVE_RENAME_SUCCEEDED_NO_VERIFIED_RECEIPT","CRASH_POINT_NOT_REACHED");
                string dir=Path.Combine(Session,"crash-after-kernel");
                Check(!File.Exists(Path.Combine(dir,"source.bin")),"CRASH_SOURCE_STATE_UNEXPECTED");
                Text(Path.Combine(dir,"archive.bin"),Original);
                // Inspect existing fixture only. Do not resubmit, recreate source, restore, or clean up.
                Console.WriteLine("# classification=UNRESOLVED_NO_VERIFIED_RECEIPT childLaunches=1 retries=0 cleanup=0 retained=archive.bin");
            });
        }
    }
}
