; Custom NSIS Branding for FZR Rekordbox Exporter
; Fuses Pioneer Rekordbox, Traktor Pro, and Spotify aesthetic into the Windows installer wizard.

!macro customHeader
  !ifndef MUI_WELCOMEPAGE_TITLE
    !define MUI_WELCOMEPAGE_TITLE "FZR Rekordbox Exporter"
  !endif
  !ifndef MUI_WELCOMEPAGE_TEXT
    !define MUI_WELCOMEPAGE_TEXT "Bienvenido al asistente de instalacion de FZR Rekordbox Exporter.$\r$\n$\r$\nHub bidireccional 100% local para DJs:$\r$\n  - Rekordbox XML / M3U8 / TXT / CSV$\r$\n  - Traktor Pro NML v19 (BPM, Open Key y Hot Cues)$\r$\n  - Spotify OAuth PKCE con revision manual$\r$\n  - Analisis armonico Camelot y reparador de rutas$\r$\n$\r$\nPulsa Siguiente para continuar."
  !endif
  !ifndef MUI_FINISHPAGE_TITLE
    !define MUI_FINISHPAGE_TITLE "FZR Rekordbox Exporter listo para la cabina"
  !endif
  !ifndef MUI_FINISHPAGE_TEXT
    !define MUI_FINISHPAGE_TEXT "La instalacion se completo correctamente.$\r$\n$\r$\nTu libreria nunca sale de tu equipo. Ya puedes abrir FZR Rekordbox Exporter y arrastrar tu primera playlist."
  !endif
  !ifndef MUI_FINISHPAGE_RUN_TEXT
    !define MUI_FINISHPAGE_RUN_TEXT "Abrir FZR Rekordbox Exporter ahora"
  !endif
!macroend
