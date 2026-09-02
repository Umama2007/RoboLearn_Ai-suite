Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Start Python Backend silently
WshShell.Run "cmd /c cd /d """ & strPath & "\backend"" && python app.py", 0, False

' Start Vite Frontend silently
WshShell.Run "cmd /c cd /d """ & strPath & "\frontend"" && npm run dev", 0, False

' Wait 3 seconds for servers to start
WScript.Sleep 3000

' Open default browser to localhost:3000
WshShell.Run "http://localhost:3000"
