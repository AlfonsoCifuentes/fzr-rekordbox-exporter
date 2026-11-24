; Custom NSIS Branding for FZR Rekordbox Exporter v1.5.0
; Fuses Pioneer Rekordbox, Traktor Pro, and Spotify aesthetic into the Windows installer wizard.

!macro customHeader
  !ifndef MUI_WELCOMEPAGE_TITLE
    !define MUI_WELCOMEPAGE_TITLE "FZR Rekordbox Exporter v1.5"
  !endif
  !ifndef MUI_WELCOMEPAGE_TEXT
    !define MUI_WELCOMEPAGE_TEXT "Bienvenido a FZR Booth OS - Hub bidireccional 100% local para DJs.$\r$\n$\r$\nIncluye soporte nativo para:$\r$\n  - Rekordbox XML, M3U8, UTF-16 TXT y CSV Streaming$\r$\n  - Traktor Pro NML v19 (BPM, Open Key y Hot Cues)$\r$\n  - Serato DJ (.crate) y VirtualDJ XML$\r$\n  - Spotify OAuth PKCE con revision manual y cache local$\r$\n  - Rueda Camelot, Curva BPM, CUE Sheet y Booth Prep HTML$\r$\n$\r$\nPulsa Siguiente para iniciar la instalacion."
  !endif
  !ifndef MUI_FINISHPAGE_TITLE
    !define MUI_FINISHPAGE_TITLE "FZR Rekordbox Exporter listo para la cabina"
  !endif
  !ifndef MUI_FINISHPAGE_TEXT
    !define MUI_FINISHPAGE_TEXT "Instalacion completada con exito.$\r$\n$\r$\nTu libreria y tu musica nunca salen de tu ordenador. Ya puedes abrir FZR y arrastrar tus playlists."
  !endif
  !ifndef MUI_FINISHPAGE_RUN_TEXT
    !define MUI_FINISHPAGE_RUN_TEXT "Abrir FZR Rekordbox Exporter ahora"
  !endif
  !ifndef MUI_FINISHPAGE_LINK
    !define MUI_FINISHPAGE_LINK "Visitar FZR Web Deck (fzr-rekordbox-exporter.pages.dev)"
  !endif
  !ifndef MUI_FINISHPAGE_LINK_LOCATION
    !define MUI_FINISHPAGE_LINK_LOCATION "https://fzr-rekordbox-exporter.pages.dev"
  !endif
!macroend
