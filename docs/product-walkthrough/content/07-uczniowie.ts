import type { Chapter } from './walkthrough.types';

export const chapter07: Chapter = {
  title: 'Uczniowie — lista, profil, zaproszenie',
  lead: 'Lista osób w studiu, profil ucznia z całą historią i formularz dodawania, który od razu wysyła zaproszenie. Uczeń bez e-maila też może istnieć — jako profil prowadzony przez nauczyciela, łączony z kontem później.',
  blocks: [
    {
      kind: 'screens',
      items: [
        {
          title: 'Osoby',
          shot: 't-users',
          see: '„Osoby · Widoczne: 4”, przycisk „+ Nowy uczeń”, szukajka po imieniu lub e-mailu, filtry roli i statusu. Wiersze: awatar z inicjałami, imię, e-mail, rola <b>Uczeń</b>, data dołączenia i link „Wyślij ponownie” przy tych, którzy nie przyjęli zaproszenia.',
          why: '„Wyślij ponownie” stoi tam, gdzie problem jest widoczny: przy osobie, która jeszcze się nie zalogowała.',
          pitch: 'Widać od razu, kto z zaproszonych realnie wszedł.',
        },
        {
          title: 'Uczeń · profil',
          shot: 't-user-detail',
          see: 'Zofia Nowak, plakietka „On track”, od 27 sierpnia, e-mail. Przyciski <b>Wiadomość</b>, <b>Zaplanuj lekcję</b>, „Importuj utwory”. Kafle: seria ćwiczeń 5 dni, frekwencja 100 % (ostatnie 10), repertuar 5 utworów, 13 lekcji ukończonych. Zakładki Przegląd / Lekcje / Repertuar / Umiejętności; wykres „Minuty ćwiczeń · 195 · +105 % vs poprzedni”.',
          why: 'Jeden ekran na rozmowę z uczniem albo rodzicem: czy chodzi, czy ćwiczy, co gra, od kiedy.',
          pitch: 'Postęp ucznia w liczbach, których nie trzeba zbierać ręcznie.',
          note: 'Plakietka „On track” jest po angielsku.',
        },
        {
          title: 'Dodaj ucznia',
          shot: 't-user-new',
          see: '„Dodaj ucznia.” — cztery sekcje w akordeonie: I · <b>Kim są</b> (imię i nazwisko, instrument, poziom Beginner / Novice / Intermediate / Advanced, data rozpoczęcia, kolor awatara), II · <b>Kontakt do ucznia</b>, dalej rozliczenia i harmonogram. Podtytuł: „Do rozpoczęcia wystarczą imię i nazwisko oraz poziom.”',
          why: 'Minimum to dwa pola; e-mail w sekcji kontakt wysyła zaproszenie w momencie zapisu. Reszta może poczekać.',
          pitch: 'Zaproszenie ucznia to ten sam ruch co dodanie go do listy.',
          note: 'Nazwy poziomów (Beginner, Novice…) są po angielsku w polskim formularzu.',
        },
      ],
    },
    {
      kind: 'text',
      html: '<p><b>Uczeń bez konta.</b> Jeśli e-mail zostanie pusty, powstaje profil „cień”: nauczyciel prowadzi mu lekcje i repertuar normalnie, a gdy uczeń dostanie zaproszenie i założy hasło, historia przechodzi na jego konto (test F02). Role (administrator / nauczyciel / uczeń) nadaje się w profilu; rodzic to flaga z linkiem do dziecka.</p>',
    },
  ],
};
