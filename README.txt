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


DODATKOWY PODZIAŁ GIER:
Każda gra osadzona wcześniej jako iframe srcdoc została wyodrębniona do katalogu gry/<nazwa>/<nazwa>.html. Główny projekt ładuje teraz te pliki z dysku przez iframe src. Możesz przesłać osobny plik HTML konkretnej gry do edycji. Współpraca z platformą (np. logowanie/statystyki) nadal korzysta z komunikacji z główną stroną, więc przy zmianach integracji może być potrzebny także odpowiedni plik wspólny JS.


STRUKTURA GIER (każda gra = osobny HTML + osobny CSS):
Każda gra w katalogu gry/<nazwa>/ ma teraz dwa pliki:
  <nazwa>.html — struktura i logika gry
  <nazwa>.css  — wygląd, motyw, kolory, czcionki gry (dawny blok <style>)
Aby zmienić wygląd jednej gry, edytuj tylko jej plik .css (np. gry/tabu/tabu.css).
Gra Prawdziwe życie ma dodatkowo plik .js.
Tukan jest teraz ładowany z gry/tukan/tukan.html (wcześniej z kopii zaszytej w core-platform.js),
dzięki czemu zmiany w tukan.html i tukan.css są od razu widoczne na stronie.
