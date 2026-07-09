-- ===========================================================================
-- Boss Gauntlet quests (run AFTER 0007_boss_gauntlet.sql)
-- ===========================================================================

insert into public.quests (slug, title, description, points, verification_type, order_index)
values
  ('defeat-ansem', 'Ansem Slayer',
   'Defeat Ansem in the Boss Gauntlet ladder.',
   125, 'manual', 16),

  ('boss-gauntlet-champion', 'Gauntlet Champion',
   'Clear all seven bosses in Boss Gauntlet, including Toly.',
   300, 'manual', 17)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  points = excluded.points,
  verification_type = excluded.verification_type,
  order_index = excluded.order_index;
