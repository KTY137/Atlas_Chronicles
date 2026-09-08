// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { once } from "node:events";

/** Fixed native supervisor. The model process starts suspended, enters the Job Object,
 * then runs. Closing/killing this supervisor closes the job and terminates descendants.
 * Source is embedded so desktop packaging cannot silently omit a runtime resource. */
const SOURCE = String.raw`
using System;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
public static class AtlasChronistJob {
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFO {
    public uint cb; public string reserved, desktop, title;
    public uint x,y,xsize,ysize,xchars,ychars,fill,flags;
    public short show,reserved2; public IntPtr reservedPtr,input,output,error;
  }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFOEX { public STARTUPINFO startup; public IntPtr attributes; }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr process,thread; public uint pid,tid; }
  [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMIT {
    public long processTime,jobTime; public uint flags; public UIntPtr minimumWorkingSet,maximumWorkingSet;
    public uint activeProcesses; public UIntPtr affinity; public uint priority,scheduling;
  }
  [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong readOperations,writeOperations,otherOperations,readBytes,writeBytes,otherBytes; }
  [StructLayout(LayoutKind.Sequential)] struct EXTENDED_LIMIT {
    public BASIC_LIMIT basic; public IO_COUNTERS io;
    public UIntPtr processMemory,jobMemory,peakProcessMemory,peakJobMemory;
  }
  public sealed class Configuration { public string executable; public string[] arguments; public string cwd; }
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr security,string name);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int type,ref EXTENDED_LIMIT info,uint length);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,int reserved,ref IntPtr size);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,IntPtr value,IntPtr size,IntPtr previous,IntPtr returned);
  [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string application,StringBuilder command,IntPtr processSecurity,IntPtr threadSecurity,bool inherit,uint flags,IntPtr environment,string cwd,ref STARTUPINFOEX startup,out PROCESS_INFORMATION process);
  [DllImport("kernel32.dll",SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint duration);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
  [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process,uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int kind);
  static string Quote(string value) {
    if(value==null || value.IndexOf('\0')>=0) throw new Exception();
    var result=new StringBuilder("\""); int slashes=0;
    foreach(char c in value) {
      if(c=='\\') { slashes++; continue; }
      if(c=='"') { result.Append('\\',slashes*2+1); result.Append(c); slashes=0; continue; }
      result.Append('\\',slashes); slashes=0; result.Append(c);
    }
    result.Append('\\',slashes*2); return result.Append('"').ToString();
  }
  public static int Main(string[] arguments) {
    IntPtr job=IntPtr.Zero,attributes=IntPtr.Zero,jobList=IntPtr.Zero; bool attributesReady=false;
    PROCESS_INFORMATION child=new PROCESS_INFORMATION();
    try {
      if(arguments.Length!=1) return 120;
      var input=File.ReadAllText(arguments[0]); if(input.Length>131072) return 120;
      var config=new JavaScriptSerializer().Deserialize<Configuration>(input);
      if(config==null || !Path.IsPathRooted(config.executable) || !Path.IsPathRooted(config.cwd) || config.arguments==null || config.arguments.Length>64) return 120;
      var command=new StringBuilder(Quote(config.executable)); foreach(var argument in config.arguments) command.Append(' ').Append(Quote(argument));
      if(command.Length>30000) return 120;
      job=CreateJobObject(IntPtr.Zero,null); if(job==IntPtr.Zero) return 121;
      var limits=new EXTENDED_LIMIT(); limits.basic.flags=0x2000|0x8; limits.basic.activeProcesses=8;
      if(!SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf(typeof(EXTENDED_LIMIT)))) return 121;
      var startup=new STARTUPINFOEX(); startup.startup.cb=(uint)Marshal.SizeOf(typeof(STARTUPINFOEX));
      startup.startup.flags=0x100; startup.startup.input=GetStdHandle(-10); startup.startup.output=GetStdHandle(-11); startup.startup.error=GetStdHandle(-12);
      // The job is part of the creation call (PROC_THREAD_ATTRIBUTE_JOB_LIST), never a later
      // assignment: a supervisor that dies before ResumeThread must not leave a suspended orphan.
      IntPtr required=IntPtr.Zero; InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref required);
      if(required==IntPtr.Zero) return 121;
      attributes=Marshal.AllocHGlobal(required);
      if(!InitializeProcThreadAttributeList(attributes,1,0,ref required)) return 121;
      attributesReady=true;
      jobList=Marshal.AllocHGlobal(IntPtr.Size); Marshal.WriteIntPtr(jobList,job);
      if(!UpdateProcThreadAttribute(attributes,0,(IntPtr)0x0002000D,jobList,(IntPtr)IntPtr.Size,IntPtr.Zero,IntPtr.Zero)) return 121;
      startup.attributes=attributes;
      // Suspended + no console + extended startup. No command interpreter and no window.
      if(!CreateProcess(config.executable,command,IntPtr.Zero,IntPtr.Zero,true,0x08080004,IntPtr.Zero,config.cwd,ref startup,out child)) return 122;
      // Deterministic local regression seam; production's fixed environment omits it.
      if(Environment.GetEnvironmentVariable("ATLAS_CHRONIST_TEST_SUSPENDED_START")=="1") {
        Console.WriteLine("ATLAS_CHRONIST_JOB_SUSPENDED_PID="+child.pid); Console.Out.Flush();
        System.Threading.Thread.Sleep(System.Threading.Timeout.Infinite);
      }
      if(ResumeThread(child.thread)==0xffffffff) { TerminateProcess(child.process,124); return 124; }
      CloseHandle(child.thread); child.thread=IntPtr.Zero;
      if(WaitForSingleObject(child.process,0xffffffff)!=0) return 125;
      uint exit; if(!GetExitCodeProcess(child.process,out exit)) return 125;
      return unchecked((int)exit);
    } catch { return 126; }
    finally {
      if(attributesReady) DeleteProcThreadAttributeList(attributes);
      if(attributes!=IntPtr.Zero) Marshal.FreeHGlobal(attributes);
      if(jobList!=IntPtr.Zero) Marshal.FreeHGlobal(jobList);
      if(job!=IntPtr.Zero) CloseHandle(job);
      if(child.thread!=IntPtr.Zero) CloseHandle(child.thread);
      if(child.process!=IntPtr.Zero) CloseHandle(child.process);
    }
  }
}
`;

/** Explicit host setup only; never called by provider GET or native import. */
export async function compileChronistWindowsJob(directory: string): Promise<string> {
  if (process.platform !== "win32" || !isAbsolute(directory)) throw new Error("CLI-Prozessgrenze nicht verfügbar.");
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot || !isAbsolute(systemRoot)) throw new Error("CLI-Prozessgrenze nicht verfügbar.");
  const source = join(directory, "chronist-job.cs"), executable = join(directory, "chronist-job.exe");
  await writeFile(source, SOURCE, { flag: "wx" });
  const compiler = spawn(join(systemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
    ["/nologo", "/target:exe", "/reference:System.Web.Extensions.dll", `/out:${executable}`, source],
    { cwd: directory, shell: false, windowsHide: true, env: { SystemRoot: systemRoot, WINDIR: systemRoot, TEMP: directory, TMP: directory } });
  compiler.stdout.resume(); compiler.stderr.resume();
  const timeout = setTimeout(() => compiler.kill(), 15_000);
  try { const [code] = await once(compiler, "close"); if (code !== 0) throw new Error("CLI-Prozessgrenze nicht verfügbar."); }
  finally { clearTimeout(timeout); }
  return executable;
}

/** Caller owns the fresh directory and must have consumed the call's server permit. */
export async function spawnChronistWindowsJob(supervisor: string, executable: string, arguments_: readonly string[],
  directory: string, environment: Readonly<Record<string, string>>): Promise<ChildProcessWithoutNullStreams> {
  if (![supervisor, executable, directory].every(isAbsolute)) throw new Error("CLI-Prozessgrenze nicht verfügbar.");
  const configuration = join(directory, "chronist-process.json");
  await writeFile(configuration, JSON.stringify({ executable, arguments: arguments_, cwd: directory }), { flag: "wx" });
  return spawn(supervisor, [configuration], { cwd: directory, env: { ...environment }, shell: false, windowsHide: true });
}
