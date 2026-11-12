-- =====================================================================
--  THE FAMILY VILLAGE — step 2: starter trivia + one storage fix
--  Run ONCE in Supabase SQL Editor (after 01_setup.sql).
-- =====================================================================

-- lets family members manage meme files (needed for deleting memes)
create policy reactions_read on storage.objects for select to authenticated
  using (bucket_id = 'reactions' and public.is_member());

create or replace function private.seed_q(q text, c jsonb, a int, cat text) returns void
language plpgsql as $$ declare v bigint; begin
  insert into public.trivia_questions (question, choices, category) values (q, c, cat) returning id into v;
  insert into private.trivia_keys values (v, a);
end $$;

select private.seed_q('What''s the powerhouse of the cell?', '["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"]', 1, 'science');
select private.seed_q('Which organelle builds proteins?', '["Ribosome", "Lysosome", "Vacuole", "Centriole"]', 0, 'science');
select private.seed_q('Normal human body temperature in °F?', '["96.8", "97.6", "98.6", "99.6"]', 2, 'science');
select private.seed_q('How many bones are in the adult human body?', '["186", "206", "226", "256"]', 1, 'science');
select private.seed_q('What''s the largest organ of the human body?', '["Liver", "Brain", "Lungs", "Skin"]', 3, 'science');
select private.seed_q('What''s the chemical symbol for sodium?', '["So", "Sd", "Na", "S"]', 2, 'science');
select private.seed_q('What''s the pH of pure water at 25°C?', '["0", "7", "10", "14"]', 1, 'science');
select private.seed_q('Which blood type is the universal red-cell donor?', '["AB+", "O−", "A−", "B+"]', 1, 'science');
select private.seed_q('How many chambers does the human heart have?', '["2", "3", "4", "6"]', 2, 'science');
select private.seed_q('Avogadro''s number is about…', '["6.02 × 10²³", "3.14 × 10⁸", "9.81 × 10²", "1.6 × 10⁻¹⁹"]', 0, 'science');
select private.seed_q('Which vitamin does your skin make from sunlight?', '["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"]', 2, 'science');
select private.seed_q('What kind of bonds hold the two strands of DNA together?', '["Ionic", "Hydrogen", "Peptide", "Metallic"]', 1, 'science');
select private.seed_q('In DNA, adenine pairs with…', '["Guanine", "Cytosine", "Uracil", "Thymine"]', 3, 'science');
select private.seed_q('Which base replaces thymine in RNA?', '["Uracil", "Adenine", "Inosine", "Cytosine"]', 0, 'science');
select private.seed_q('What''s the smallest bone in the human body?', '["Stapes", "Incus", "Malleus", "Hyoid"]', 0, 'science');
select private.seed_q('Which gland is nicknamed the ''master gland''?', '["Thyroid", "Pituitary", "Adrenal", "Pineal"]', 1, 'science');
select private.seed_q('Which organ produces insulin?', '["Liver", "Gallbladder", "Pancreas", "Kidney"]', 2, 'science');
select private.seed_q('What''s the most abundant gas in Earth''s atmosphere?', '["Oxygen", "Carbon dioxide", "Argon", "Nitrogen"]', 3, 'science');
select private.seed_q('What''s the atomic number of carbon?', '["6", "8", "12", "14"]', 0, 'science');
select private.seed_q('What''s the functional unit of the kidney?', '["Alveolus", "Nephron", "Neuron", "Villus"]', 1, 'science');
select private.seed_q('Where does gas exchange happen in the lungs?', '["Bronchi", "Trachea", "Alveoli", "Pleura"]', 2, 'science');
select private.seed_q('Which cells carry oxygen in the blood?', '["Red blood cells", "White blood cells", "Platelets", "Plasma cells"]', 0, 'science');
select private.seed_q('Newton''s second law is…', '["F = ma", "E = mc²", "PV = nRT", "V = IR"]', 0, 'science');
select private.seed_q('What''s the SI unit of force?', '["Joule", "Watt", "Newton", "Pascal"]', 2, 'science');
select private.seed_q('The speed of light is about…', '["300,000 km/s", "30,000 km/s", "3,000 km/s", "3 million km/s"]', 0, 'science');
select private.seed_q('Which of these is NOT a noble gas?', '["Neon", "Argon", "Nitrogen", "Xenon"]', 2, 'science');
select private.seed_q('In which phase of mitosis do chromosomes line up in the middle?', '["Prophase", "Metaphase", "Anaphase", "Telophase"]', 1, 'science');
select private.seed_q('One round of meiosis turns one cell into how many cells?', '["2", "4", "8", "1"]', 1, 'science');
select private.seed_q('How many chromosomes are in a normal human body cell?', '["23", "44", "46", "48"]', 2, 'science');
select private.seed_q('Most enzymes are what kind of molecule?', '["Lipids", "Carbohydrates", "Proteins", "Nucleic acids"]', 2, 'science');
select private.seed_q('Which gas do plants take in for photosynthesis?', '["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"]', 1, 'science');
select private.seed_q('What''s the longest bone in the human body?', '["Tibia", "Humerus", "Femur", "Fibula"]', 2, 'science');
select private.seed_q('Which part of the brain is in charge of balance and coordination?', '["Cerebellum", "Medulla", "Hypothalamus", "Frontal lobe"]', 0, 'science');
select private.seed_q('Which neurotransmitter works at the neuromuscular junction?', '["Dopamine", "Serotonin", "Acetylcholine", "GABA"]', 2, 'science');
select private.seed_q('What''s the chemical formula for glucose?', '["C₆H₁₂O₆", "C₁₂H₂₂O₁₁", "CH₄", "C₂H₅OH"]', 0, 'science');
select private.seed_q('Which of these is a strong acid?', '["Acetic acid", "Hydrochloric acid", "Carbonic acid", "Citric acid"]', 1, 'science');
select private.seed_q('The ideal gas law is…', '["PV = nRT", "F = ma", "a² + b² = c²", "pH = −log[H⁺]"]', 0, 'science');
select private.seed_q('Who is credited with discovering penicillin?', '["Louis Pasteur", "Alexander Fleming", "Marie Curie", "Edward Jenner"]', 1, 'science');
select private.seed_q('Edward Jenner made the first vaccine for…', '["Polio", "Measles", "Smallpox", "Rabies"]', 2, 'science');
select private.seed_q('What''s the highest possible total MCAT score?', '["472", "500", "528", "600"]', 2, 'science');
select private.seed_q('Which hormone lowers blood sugar?', '["Glucagon", "Insulin", "Cortisol", "Epinephrine"]', 1, 'science');
select private.seed_q('Which organelle is full of digestive enzymes?', '["Lysosome", "Ribosome", "Nucleolus", "Chloroplast"]', 0, 'science');
select private.seed_q('Which valve sits between the left atrium and left ventricle?', '["Tricuspid", "Mitral", "Pulmonary", "Aortic"]', 1, 'science');
select private.seed_q('Which blood vessels carry blood away from the heart?', '["Veins", "Capillaries", "Arteries", "Venules"]', 2, 'science');
select private.seed_q('A normal adult resting heart rate is…', '["30–50 bpm", "60–100 bpm", "110–140 bpm", "150–180 bpm"]', 1, 'science');
select private.seed_q('Which metal is in hemoglobin?', '["Copper", "Zinc", "Iron", "Magnesium"]', 2, 'science');
select private.seed_q('Ethanol belongs to which functional group?', '["Alcohol (–OH)", "Ketone", "Ester", "Amine"]', 0, 'science');
select private.seed_q('How many carbon atoms are in a benzene ring?', '["4", "5", "6", "8"]', 2, 'science');
select private.seed_q('What''s the charge of a neutron?', '["Positive", "Negative", "Neutral", "It depends"]', 2, 'science');
select private.seed_q('What does DNA stand for?', '["Deoxyribonucleic acid", "Dinitrogen acid", "Deoxyribose nitrate acid", "Dual nucleic acid"]', 0, 'science');
select private.seed_q('What''s the main pigment in photosynthesis?', '["Carotene", "Chlorophyll", "Melanin", "Hemoglobin"]', 1, 'science');
select private.seed_q('Which nervous system runs ''fight or flight''?', '["Parasympathetic", "Sympathetic", "Somatic", "Enteric"]', 1, 'science');
select private.seed_q('Which organ makes bile?', '["Gallbladder", "Pancreas", "Liver", "Stomach"]', 2, 'science');
select private.seed_q('Where does most digestion and absorption happen?', '["Stomach", "Small intestine", "Large intestine", "Esophagus"]', 1, 'science');
select private.seed_q('Pavlov''s drooling dogs are the classic example of…', '["Operant conditioning", "Classical conditioning", "Observational learning", "Habituation"]', 1, 'science');
select private.seed_q('B.F. Skinner is most associated with…', '["Classical conditioning", "Operant conditioning", "Psychoanalysis", "Hierarchy of needs"]', 1, 'science');
select private.seed_q('What''s at the top of Maslow''s hierarchy of needs?', '["Esteem", "Safety", "Self-actualization", "Belonging"]', 2, 'science');
select private.seed_q('In Piaget''s theory, babies develop object permanence in which stage?', '["Sensorimotor", "Preoperational", "Concrete operational", "Formal operational"]', 0, 'science');
select private.seed_q('Which brain region is key for forming new long-term memories?', '["Amygdala", "Hippocampus", "Cerebellum", "Pons"]', 1, 'science');
select private.seed_q('How many pairs of cranial nerves do humans have?', '["10", "12", "31", "33"]', 1, 'science');
select private.seed_q('How many pairs of spinal nerves do humans have?', '["12", "24", "31", "33"]', 2, 'science');
select private.seed_q('A normal adult breathing rate at rest is…', '["4–8 per minute", "12–20 per minute", "25–35 per minute", "40–50 per minute"]', 1, 'science');
select private.seed_q('Ohm''s law is…', '["V = IR", "E = hf", "F = kx", "P = mv"]', 0, 'science');
select private.seed_q('Which of these is an amino acid?', '["Glycine", "Glucose", "Glycerol", "Guanine"]', 0, 'science');
select private.seed_q('In a covalent bond, atoms ___ electrons.', '["Transfer", "Share", "Lose", "Repel"]', 1, 'science');
select private.seed_q('Which blood cells fight infection?', '["Erythrocytes", "Leukocytes", "Platelets", "Plasma"]', 1, 'science');
select private.seed_q('Which element has the symbol K?', '["Krypton", "Potassium", "Calcium", "Carbon"]', 1, 'science');
select private.seed_q('''Mardi Gras'' literally means…', '["Big party", "Fat Tuesday", "Mask day", "King cake"]', 1, 'general');
select private.seed_q('What''s the capital of Louisiana?', '["New Orleans", "Lafayette", "Baton Rouge", "Shreveport"]', 2, 'general');
select private.seed_q('Which river flows through New Orleans?', '["Mississippi", "Missouri", "Red River", "Atchafalaya"]', 0, 'general');
select private.seed_q('What''s the hardest natural substance?', '["Quartz", "Diamond", "Topaz", "Granite"]', 1, 'general');
select private.seed_q('What''s the largest planet in our solar system?', '["Saturn", "Jupiter", "Neptune", "Earth"]', 1, 'general');
select private.seed_q('Who wrote Romeo and Juliet?', '["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"]', 1, 'general');
select private.seed_q('What''s the fastest land animal?', '["Lion", "Pronghorn", "Cheetah", "Horse"]', 2, 'general');

drop function private.seed_q(text, jsonb, int, text);
-- 74 questions loaded. Family lore gets added from inside the village.
