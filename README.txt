ROZDZIELONA STRONA — INSTRUKCJA

Otwórz index.html przez serwer WWW (zalecane), nie zmieniaj nazw ani położenia plików.

css/       — style strony podzielone na osobne pliki w kolejności oryginału.
js/        — skrypty wydzielone z oryginalnego HTML i ładowane w tej samej kolejności.
index.html — główny dokument, który łączy style i skrypty.

Ważne:
- Zachowana została kolejność ładowania skryptów.
- Wszystkie gry mają już własny katalog w gry/ (patrz niżej). Kategorie „Państwa-Miasta” są teraz w gry/panstwa-miasta/panstwa-miasta.html.
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


WSZYSTKIE 30 GIER SĄ TERAZ OSOBNYMI PLIKAMI:
Do dotychczasowych 22 dołączyło 8 gier, które wcześniej były wbudowane w core-platform.js,
categories-panstwa-miasta.js i game-kropki-kwadraty.js:
  gry/monopoly/             — Monopoly (piłkarskie + zwykłe): monopoly.html, monopoly.css, monopoly-classic.js
  gry/zgadywanie-literek/   — Zgadywanie literek
  gry/czolko/               — Czółko
  gry/panstwa-miasta/       — Państwa Miasta
  gry/statki/               — Statki
  gry/lamanie-kodu/         — Łamanie kodu
  gry/kim-jestem/           — Kim jestem?
  gry/uno/                  — UNO
UWAGA: dawny katalog gry/panstwa-miasta/ zawierał w rzeczywistości grę „Postaw na milion” —
zmieniono go na gry/postaw-na-milion/ (postaw-na-milion.html/.css), a nazwę panstwa-miasta
dostała prawdziwa gra Państwa Miasta. Plik js/categories-panstwa-miasta.js i js/monopoly-classic.js
zostały usunięte z js/ (ich zawartość jest teraz w katalogach gier).

Jak te gry łączą się z platformą:
- Każda gra czyta konto, bazę Firebase i statystyki przez window.parent.PLATFORM_BRIDGE
  (definicja na końcu js/games-glue.js). Na początku każdego pliku gry jest krótki blok
  „most do platformy”.
- Otwieranie/zamykanie gier: funkcje xxxOpen()/xxxExit() w js/games-glue.js.
- Gry udostępniają platformie funkcje: __show, __leave, __joinFromHub(kod), __setNick, __setCol, __inRoom.
- Gry otwiera się tylko przez index.html (samodzielnie, bez platformy, działają tryby lokalne;
  tryby online wymagają Firebase z index.html).
