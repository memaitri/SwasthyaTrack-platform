-- Schema for storing meal dropdown options
create table if not exists meal_options (
  id uuid default gen_random_uuid() primary key,
  meal_type text not null, -- breakfast | lunch | dinner
  category text not null,  -- cereals | pulses | eggs | fruits | curry | dals | rice | bread | vegetables | salad
  value text not null,
  created_at timestamptz default now()
);

-- Example inserts (covers options from the specification)
insert into meal_options (meal_type, category, value) values
('breakfast','cereals','Flattened Rice (Poha)'),
('breakfast','cereals','Semolina (Rava / Sooji)'),
('breakfast','cereals','Wheat'),
('breakfast','cereals','Little Millet (Vari)'),
('breakfast','cereals','Finger Millet (Ragi)'),
('breakfast','pulses','Sprouted Moth Beans (Matki)'),
('breakfast','pulses','Chawli (Cowpea)'),
('breakfast','pulses','Bengal Gram (Harbara / Chickpea)'),
('breakfast','pulses','Vatana (Dry Peas)'),
('breakfast','eggs','1 Egg'),
('breakfast','fruits','Banana'),
('breakfast','fruits','Papaya'),
('breakfast','fruits','Apple'),
('breakfast','fruits','Guava'),
('breakfast','fruits','Orange'),
('breakfast','fruits','Sweet Lime (Mosambi)'),

('lunch','curry','Vegetable Curry'),
('lunch','curry','Chicken Curry'),
('lunch','curry','Mutton Curry'),
('lunch','dals','Black Gram Dal (Urad Dal)'),
('lunch','dals','Pigeon Pea (Toor Dal)'),
('lunch','dals','Bengal Gram (Harbara / Chickpea)'),
('lunch','dals','Green Gram Dal (Moong Dal)'),
('lunch','dals','Red Lentil (Masoor Dal)'),
('lunch','dals','Whole Green Gram'),
('lunch','dals','Sprouted Moth Beans (Matki)'),
('lunch','rice','Plain Rice'),
('lunch','rice','Yellow Rice'),
('lunch','rice','Masala Rice'),
('lunch','bread','Chapati'),
('lunch','bread','Bhakri'),
('lunch','vegetables','Root & Tuber Vegetables'),
('lunch','vegetables','Leafy Vegetables'),
('lunch','vegetables','Other Vegetables'),
('lunch','salad','Yes'),
('lunch','salad','No');

-- Duplicate entries are allowed; use an upsert script (see JS snippet) for idempotent updates.
