ROZDZIELONA STRONA — INSTRUKCJA

Otwórz index.html przez serwer WWW (zalecane), nie zmieniaj nazw ani położenia plików.

css/       — style strony podzielone na osobne pliki w kolejności oryginału.
js/        — skrypty wydzielone z oryginalnego HTML i ładowane w tej samej kolejności.
index.html — główny dokument, który łączy style i skrypty.

Ważne:
- Zachowana została kolejność ładowania skryptów.
- Kategorie „Państwa-Miasta” są w osobnym pliku categories-panstwa-miasta.js.
- Niektóre gry są zgrupowane w games-embedded.js lub core-platform.js, ponieważ w oryginale ich kod jest częścią wspólnego modułu. Nie rozdzielałem ich automatycznie na siłę, żeby nie uszkodzić zależności i działania strony.
- Zewnętrzne biblioteki Firebase pozostały podłączone tak jak w oryginale.
