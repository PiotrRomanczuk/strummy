-- ============================================================================
-- Migration 041: Seed 100 Classic Guitar Songs
-- Curated list of essential songs for guitar teaching
-- ============================================================================

INSERT INTO songs (title, author, difficulty, key, capo_fret, category, chords, release_year) VALUES

-- ============================================================================
-- BEGINNER (Level 1) - 25 songs
-- ============================================================================

-- Simple chord progressions, slow tempo, 2-4 chords
('Knockin'' on Heaven''s Door', 'Bob Dylan', 'beginner', 'G', NULL, 'Rock/Folk', 'G, D, Am, C', 1973),
('Horse with No Name', 'America', 'beginner', 'Em', NULL, 'Folk Rock', 'Em, D6/9', 1971),
('Love Me Do', 'The Beatles', 'beginner', 'G', NULL, 'Pop Rock', 'G, C, D', 1962),
('Three Little Birds', 'Bob Marley', 'beginner', 'A', NULL, 'Reggae', 'A, D, E', 1977),
('What''s Up', 'Four Non Blondes', 'beginner', 'G', 2, 'Alternative Rock', 'G, Am, C, D', 1992),
('Stand by Me', 'Ben E. King', 'beginner', 'A', NULL, 'Soul', 'A, F#m, D, E', 1961),
('Bad Moon Rising', 'Creedence Clearwater Revival', 'beginner', 'D', NULL, 'Rock', 'D, A, G', 1969),
('Yellow Submarine', 'The Beatles', 'beginner', 'G', NULL, 'Pop Rock', 'G, C, D', 1966),
('Let It Be', 'The Beatles', 'beginner', 'C', NULL, 'Pop Rock', 'C, G, Am, F', 1970),
('Hey Joe', 'Jimi Hendrix', 'beginner', 'E', NULL, 'Rock', 'C, G, D, A, E', 1966),
('Wonderwall', 'Oasis', 'beginner', 'F#m', 2, 'Britpop', 'Em7, G, Dsus4, A7sus4', 1995),
('Brown Eyed Girl', 'Van Morrison', 'beginner', 'G', NULL, 'Rock', 'G, C, D, Em', 1967),
('Peaceful Easy Feeling', 'Eagles', 'beginner', 'E', NULL, 'Country Rock', 'E, A, B', 1972),
('Wild Thing', 'The Troggs', 'beginner', 'A', NULL, 'Rock', 'A, D, E', 1966),
('Leaving on a Jet Plane', 'John Denver', 'beginner', 'G', NULL, 'Folk', 'G, C, D', 1969),
('The Joker', 'Steve Miller Band', 'beginner', 'G', NULL, 'Rock', 'G, C, D', 1973),
('I''m Yours', 'Jason Mraz', 'beginner', 'B', 4, 'Pop', 'G, D, Em, C', 2008),
('No Woman No Cry', 'Bob Marley', 'beginner', 'C', NULL, 'Reggae', 'C, G, Am, F', 1974),
('You''re Beautiful', 'James Blunt', 'beginner', 'Eb', NULL, 'Pop', 'Eb, Bb, Cm, Ab', 2005),
('Redemption Song', 'Bob Marley', 'beginner', 'G', NULL, 'Reggae', 'G, Em, C, D', 1980),
('Country Roads', 'John Denver', 'beginner', 'A', NULL, 'Country', 'A, F#m, E, D', 1971),
('Hallelujah', 'Leonard Cohen', 'beginner', 'C', NULL, 'Folk', 'C, Am, F, G', 1984),
('House of the Rising Sun', 'The Animals', 'beginner', 'Am', NULL, 'Folk Rock', 'Am, C, D, F, E', 1964),
('Wish You Were Here', 'Pink Floyd', 'beginner', 'G', NULL, 'Progressive Rock', 'Em, G, A7sus4, C, D', 1975),
('Blowin'' in the Wind', 'Bob Dylan', 'beginner', 'D', NULL, 'Folk', 'D, G, A', 1963),

-- ============================================================================
-- INTERMEDIATE (Level 2) - 30 songs
-- ============================================================================

-- More complex chords, faster tempo, barre chords
('Hotel California', 'Eagles', 'intermediate', 'Bm', NULL, 'Rock', 'Bm, F#, A, E, G, D, Em', 1976),
('Stairway to Heaven', 'Led Zeppelin', 'intermediate', 'Am', NULL, 'Rock', 'Am, E, C, D, F, G', 1971),
('Blackbird', 'The Beatles', 'intermediate', 'G', NULL, 'Folk Rock', 'G, Am, G/B, C, D', 1968),
('Tears in Heaven', 'Eric Clapton', 'intermediate', 'A', NULL, 'Ballad', 'A, E, F#m, D, Bm7, E7', 1992),
('More Than Words', 'Extreme', 'intermediate', 'G', NULL, 'Acoustic Rock', 'G, Cadd9, Am7, C, D, Dsus4', 1990),
('Dust in the Wind', 'Kansas', 'intermediate', 'C', NULL, 'Progressive Rock', 'C, Am, G, Dm', 1977),
('Sweet Child O'' Mine', 'Guns N'' Roses', 'intermediate', 'D', NULL, 'Hard Rock', 'D, C, G, A', 1987),
('Nothing Else Matters', 'Metallica', 'intermediate', 'Em', NULL, 'Metal Ballad', 'Em, Am, C, D, G, B7', 1991),
('Layla', 'Eric Clapton', 'intermediate', 'Dm', NULL, 'Rock', 'Dm, Bb, C, Gm', 1970),
('Under the Bridge', 'Red Hot Chili Peppers', 'intermediate', 'E', NULL, 'Alternative Rock', 'E, B, C#m, G#m, A', 1991),
('Smells Like Teen Spirit', 'Nirvana', 'intermediate', 'F', NULL, 'Grunge', 'F, Bb, Ab, Db', 1991),
('Free Fallin''', 'Tom Petty', 'intermediate', 'F', NULL, 'Rock', 'F, Bb, C, Dm', 1989),
('Drive', 'Incubus', 'intermediate', 'Em', NULL, 'Alternative Rock', 'Em, Cmaj7, A7sus4', 1999),
('Come As You Are', 'Nirvana', 'intermediate', 'E', NULL, 'Grunge', 'Em, D, A, C', 1991),
('Everlong', 'Foo Fighters', 'intermediate', 'D', NULL, 'Alternative Rock', 'D, Bm, G, A', 1997),
('Behind Blue Eyes', 'The Who', 'intermediate', 'Em', NULL, 'Rock', 'Em, G, D, C, A, Bm', 1971),
('The Scientist', 'Coldplay', 'intermediate', 'Dm', NULL, 'Alternative Rock', 'Dm, Bb, F, C', 2002),
('Yellow', 'Coldplay', 'intermediate', 'B', NULL, 'Alternative Rock', 'B, Badd11, F#6, Emaj7', 2000),
('Iris', 'Goo Goo Dolls', 'intermediate', 'D', NULL, 'Alternative Rock', 'Bm, Aadd9, G, D', 1998),
('Good Riddance (Time of Your Life)', 'Green Day', 'intermediate', 'G', NULL, 'Punk Rock', 'G, Cadd9, D, Em', 1997),
('Boulevard of Broken Dreams', 'Green Day', 'intermediate', 'Fm', NULL, 'Punk Rock', 'Fm, Ab, Eb, Bb', 2004),
('Californication', 'Red Hot Chili Peppers', 'intermediate', 'Am', NULL, 'Alternative Rock', 'Am, F, C, Dm, G', 1999),
('Hey There Delilah', 'Plain White T''s', 'intermediate', 'D', NULL, 'Pop Rock', 'D, F#m, Bm, G, A', 2006),
('Mr. Jones', 'Counting Crows', 'intermediate', 'Am', NULL, 'Alternative Rock', 'Am, F, Dm, G, C', 1993),
('Come Together', 'The Beatles', 'intermediate', 'Dm', NULL, 'Rock', 'Dm, A, G, Bm', 1969),
('Champagne Supernova', 'Oasis', 'intermediate', 'A', NULL, 'Britpop', 'A, A/G, A/F#, A/E', 1995),
('The Man Who Sold the World', 'David Bowie', 'intermediate', 'A', NULL, 'Rock', 'A, Dm, F, C', 1970),
('About a Girl', 'Nirvana', 'intermediate', 'Em', NULL, 'Grunge', 'Em, G', 1989),
('Heart of Gold', 'Neil Young', 'intermediate', 'Em', NULL, 'Folk Rock', 'Em, C, D, G', 1972),
('Fire and Rain', 'James Taylor', 'intermediate', 'C', NULL, 'Folk Rock', 'C, Gm7, F, Bb', 1970),

-- ============================================================================
-- ADVANCED (Level 3) - 25 songs
-- ============================================================================

-- Complex fingerpicking, advanced techniques, jazz chords
('Classical Gas', 'Mason Williams', 'advanced', 'E', NULL, 'Classical', 'Various', 1968),
('Landslide', 'Fleetwood Mac', 'advanced', 'Eb', 3, 'Folk Rock', 'Eb, Bb/D, Cm, Bb', 1975),
('Stop This Train', 'John Mayer', 'advanced', 'C', NULL, 'Pop', 'C, G/B, Am, Am/G, F, G', 2006),
('Little Wing', 'Jimi Hendrix', 'advanced', 'Em', NULL, 'Rock', 'Em, G, Am, Bm, Bb, C, D', 1967),
('Purple Haze', 'Jimi Hendrix', 'advanced', 'E', NULL, 'Rock', 'E7#9, G, A', 1967),
('Cliffs of Dover', 'Eric Johnson', 'advanced', 'G', NULL, 'Instrumental Rock', 'Various', 1990),
('Europa', 'Santana', 'advanced', 'Am', NULL, 'Latin Rock', 'Am, Dm, Em, F, G', 1976),
('Neon', 'John Mayer', 'advanced', 'C', 4, 'Pop', 'Cmaj7, Gmaj7/B, Am7, F', 2001),
('The Wind Cries Mary', 'Jimi Hendrix', 'advanced', 'Eb', NULL, 'Rock', 'Eb, E, F, Bb, C, Db', 1967),
('Bold as Love', 'Jimi Hendrix', 'advanced', 'E', NULL, 'Rock', 'E, C#m, A, B', 1967),
('Voodoo Child', 'Jimi Hendrix', 'advanced', 'E', NULL, 'Rock', 'E7#9, A, B', 1968),
('Texas Flood', 'Stevie Ray Vaughan', 'advanced', 'G', NULL, 'Blues', 'G7, C7, D7', 1983),
('Pride and Joy', 'Stevie Ray Vaughan', 'advanced', 'E', NULL, 'Blues', 'E7, A7, B7', 1983),
('Roundabout', 'Yes', 'advanced', 'E', NULL, 'Progressive Rock', 'E, Eadd9, Aadd9, F#m', 1971),
('Jessica', 'The Allman Brothers Band', 'advanced', 'A', NULL, 'Southern Rock', 'A, D, E, Bm', 1973),
('Samba Pa Ti', 'Santana', 'advanced', 'Gm', NULL, 'Latin Rock', 'Gm, Cm, D7, Eb', 1970),
('Since I''ve Been Loving You', 'Led Zeppelin', 'advanced', 'Cm', NULL, 'Blues Rock', 'Cm, Fm, Bb, Eb, Ab', 1970),
('Sultans of Swing', 'Dire Straits', 'advanced', 'Dm', NULL, 'Rock', 'Dm, C, Bb, A7, F, Em', 1978),
('All Along the Watchtower', 'Jimi Hendrix', 'advanced', 'C#m', NULL, 'Rock', 'C#m, B, A, G#', 1968),
('Crazy Train', 'Ozzy Osbourne', 'advanced', 'F#m', NULL, 'Heavy Metal', 'F#m, A, E, D', 1980),
('Master of Puppets', 'Metallica', 'advanced', 'E', NULL, 'Thrash Metal', 'Em, F#, G, A', 1986),
('Comfortably Numb', 'Pink Floyd', 'advanced', 'Bm', NULL, 'Progressive Rock', 'Bm, A, G, Em, D, C', 1979),
('Time', 'Pink Floyd', 'advanced', 'F#m', NULL, 'Progressive Rock', 'F#m, A, E, Dmaj7', 1973),
('Paranoid Android', 'Radiohead', 'advanced', 'Cm', NULL, 'Alternative Rock', 'Cm, Gm, Bb, Dm, Am', 1997),
('Green Tinted Sixties Mind', 'Mr. Big', 'advanced', 'E', NULL, 'Rock', 'E, A, B, C#m, F#m', 1991),

-- ============================================================================
-- EXPERT (Level 4) - 20 songs
-- ============================================================================

-- Virtuosic techniques, complex arrangements
('Eruption', 'Van Halen', 'expert', 'Am', NULL, 'Hard Rock', 'Am, E, F, G', 1978),
('YYZ', 'Rush', 'expert', 'E', NULL, 'Progressive Rock', 'Various', 1981),
('Bohemian Rhapsody', 'Queen', 'expert', 'Bb', NULL, 'Progressive Rock', 'Bb, Cm, F7, Gm, Eb, Ab', 1975),
('La Villa Strangiato', 'Rush', 'expert', 'D', NULL, 'Progressive Rock', 'Various', 1978),
('Scarified', 'Racer X', 'expert', 'Gm', NULL, 'Heavy Metal', 'Various', 1988),
('For the Love of God', 'Steve Vai', 'expert', 'Cm', NULL, 'Instrumental Rock', 'Cm, Ab, Bb, Fm', 1990),
('Surfing with the Alien', 'Joe Satriani', 'expert', 'F#', NULL, 'Instrumental Rock', 'Various', 1987),
('Always with Me, Always with You', 'Joe Satriani', 'expert', 'B', NULL, 'Instrumental Rock', 'B, E, F#', 1987),
('Tender Surrender', 'Steve Vai', 'expert', 'A', NULL, 'Instrumental Rock', 'A, D, E, F#m', 1995),
('Technical Difficulties', 'Racer X', 'expert', 'Em', NULL, 'Heavy Metal', 'Various', 1988),
('Far Beyond the Sun', 'Yngwie Malmsteen', 'expert', 'Dm', NULL, 'Neoclassical Metal', 'Dm, Am, Bb, C', 1984),
('Black Star', 'Yngwie Malmsteen', 'expert', 'Fm', NULL, 'Neoclassical Metal', 'Fm, Cm, Db, Eb', 1984),
('Mr. Crowley', 'Ozzy Osbourne', 'expert', 'Dm', NULL, 'Heavy Metal', 'Dm, Bb, C, Am, F', 1980),
('Glasgow Kiss', 'John Petrucci', 'expert', 'Am', NULL, 'Progressive Metal', 'Various', 2005),
('Damage Control', 'John Petrucci', 'expert', 'E', NULL, 'Progressive Metal', 'Various', 2005),
('Altitudes', 'Jason Becker', 'expert', 'Gm', NULL, 'Neoclassical Metal', 'Various', 1988),
('Blue Powder', 'Steve Vai', 'expert', 'A', NULL, 'Instrumental Rock', 'Various', 1995),
('The Mystical Potato Head Groove Thing', 'Joe Satriani', 'expert', 'Em', NULL, 'Instrumental Rock', 'Various', 1987),
('Technical Ecstasy', 'Jason Becker', 'expert', 'Em', NULL, 'Neoclassical Metal', 'Various', 1988),
('Time Machine', 'Joe Satriani', 'expert', 'Bm', NULL, 'Instrumental Rock', 'Various', 1993)

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Beginner: 25 songs (2-4 chords, slow tempo, foundational songs)
-- Intermediate: 30 songs (barre chords, complex rhythms, popular classics)
-- Advanced: 25 songs (fingerpicking, jazz chords, intermediate techniques)
-- Expert: 20 songs (virtuosic playing, complex arrangements)
-- Total: 100 songs
-- ============================================================================
