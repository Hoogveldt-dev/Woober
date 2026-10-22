import type { Plek } from '../types';
import { LOSLOOPGEBIED } from './stad';

const DAG = 24 * 3600000;

/**
 * Losloopgebieden, hondvriendelijke stranden en horeca in de demowijk.
 * In de echte app komen deze uit de tabel plekken; Woober voegt ze toe, gebruikers schrijven de reviews.
 */
export function maakDemoPlekken(nu = Date.now()): Plek[] {
  return [
    {
      id: 'p-park',
      soort: 'losloop',
      naam: 'Hondenveld Stadspark',
      punt: { x: (LOSLOOPGEBIED.x1 + LOSLOOPGEBIED.x2) / 2, y: (LOSLOOPGEBIED.y1 + LOSLOOPGEBIED.y2) / 2 },
      omschrijving: 'Omheind veld in de noordoosthoek van het Stadspark. Ideaal voor een rondje rennen zonder lijn.',
      kenmerken: ['Omheind', 'Hele dag los', 'Poepzakjes', 'Bankjes'],
      reviews: [
        { id: 'pr1', van: 'Sanne', sterren: 5, tekst: 'Fijn dat het omheind is, Bo kan hier echt even los.', datum: nu - 2 * DAG },
        { id: 'pr2', van: 'Mehmet', sterren: 4, tekst: 'Na regen wel erg modderig bij de ingang.', datum: nu - 9 * DAG },
        { id: 'pr3', van: 'Lotte', sterren: 5, tekst: 'Rond vijf uur veel honden, gezellig voor sociale honden.', datum: nu - 20 * DAG },
      ],
    },
    {
      id: 'p-uiterwaard',
      soort: 'losloop',
      naam: 'Uiterwaarden aan de Waal',
      punt: { x: 160, y: 158 },
      omschrijving: 'Ruim losloopgebied langs de rivier, met gras en zand. Let op grazende koeien en paarden.',
      kenmerken: ['Niet omheind', 'Water in de buurt', 'Grazers'],
      regels: 'Van 15 maart tot 15 juli broedseizoen: honden aan de lijn.',
      reviews: [
        { id: 'pr4', van: 'Daan', sterren: 5, tekst: 'Mooiste wandeling van de stad, zeker bij zonsondergang.', datum: nu - 4 * DAG },
        { id: 'pr5', van: 'Fleur', sterren: 3, tekst: 'Prachtig, maar mijn hond is niet te houden bij de koeien. Lijn mee!', datum: nu - 14 * DAG },
      ],
    },
    {
      id: 'p-strand-kade',
      soort: 'strand',
      naam: 'Hondenstrandje Waalkade',
      punt: { x: 760, y: 150 },
      omschrijving: 'Klein zandstrand aan de Waal waar honden het hele jaar welkom zijn. Ondiep bij de kant.',
      kenmerken: ['Hele jaar honden', 'Ondiep', 'Sterke stroming verderop'],
      regels: 'Zwemmen in de vaargeul is gevaarlijk. Houd je hond dicht bij de kant.',
      reviews: [
        { id: 'pr6', van: 'Noor', sterren: 4, tekst: 'Luna zwemt hier elke zomer. Neem een handdoek mee.', datum: nu - 6 * DAG },
        { id: 'pr7', van: 'Pieter', sterren: 4, tekst: 'Fijn strandje, soms wat glas tussen de stenen.', datum: nu - 30 * DAG },
      ],
    },
    {
      id: 'p-strand-west',
      soort: 'strand',
      naam: 'Strand De Bocht',
      punt: { x: -150, y: 152 },
      omschrijving: 'Breed rivierstrand aan de westkant. In de zomer druk met zwemmers.',
      kenmerken: ['Parkeren', 'Strandtent'],
      regels: 'Van 1 mei tot 1 oktober tussen 10:00 en 19:00 geen honden. Daarbuiten los toegestaan.',
      reviews: [{ id: 'pr8', van: 'Kim', sterren: 4, tekst: 'In de herfst heerlijk rustig met de hond.', datum: nu - 11 * DAG }],
    },
    {
      id: 'p-kade',
      soort: 'horeca',
      naam: 'Café De Kade',
      punt: { x: 355, y: 300 },
      omschrijving: 'Bruin café met terras aan de Waalkade. Honden mogen binnen en op het terras.',
      kenmerken: ['Honden binnen', 'Terras', 'Waterbak', 'Hondenkoekje'],
      reviews: [
        { id: 'pr9', van: 'Sanne', sterren: 5, tekst: 'Bo kreeg meteen een bak water en een koekje. Top!', datum: nu - 1 * DAG },
        { id: 'pr10', van: 'Jesse', sterren: 4, tekst: 'Binnen wat krap met een grote hond, terras is prima.', datum: nu - 18 * DAG },
      ],
    },
    {
      id: 'p-paviljoen',
      soort: 'horeca',
      naam: 'Parkpaviljoen',
      punt: { x: 530, y: 800 },
      omschrijving: 'Koffie en lunch aan de rand van het Stadspark. Groot terras met uitzicht op het park.',
      kenmerken: ['Alleen terras', 'Waterbak', 'Aanlijnen op het terras'],
      reviews: [{ id: 'pr11', van: 'Mehmet', sterren: 4, tekst: 'Handig na het hondenveld. Binnen mogen honden helaas niet.', datum: nu - 7 * DAG }],
    },
    {
      id: 'p-molen',
      soort: 'horeca',
      naam: 'Koffiebar De Molen',
      punt: { x: 545, y: 485 },
      omschrijving: 'Kleine koffiebar aan de Molenstraat met een eigen hondenmenu.',
      kenmerken: ['Honden binnen', 'Hondenmenu', 'Waterbak'],
      reviews: [],
    },
  ];
}
