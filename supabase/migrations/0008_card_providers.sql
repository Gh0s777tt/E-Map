-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0008 · Nowi dostawcy kart paliwowych
--  TankPool24, Morgan Fuels, IQ Card — dodanie do enuma fuel_card_provider.
-- ════════════════════════════════════════════════════════════════════

alter type fuel_card_provider add value if not exists 'tankpool24';
alter type fuel_card_provider add value if not exists 'morganfuels';
alter type fuel_card_provider add value if not exists 'iqcard';
