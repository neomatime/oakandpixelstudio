-- Optional development-only seed data for OPS Accounts Phase 1.
-- All names, contacts and .example domains below are fictional.
insert into public.clients (
  full_name, email, company, position, industry, website, location,
  lifecycle_stage, lead_source, opportunity_score, opportunity_classification,
  recommended_service_tier, recommendation_confidence,
  estimated_setup_value, estimated_monthly_value, client_status
)
select * from (values
  ('Dr Andrea van Wyk','andrea@aurumvet.example','Aurum Vet Care','Owner','Veterinary Services','https://aurumvet.example','Johannesburg, Gauteng','Discovery','OPS Discovery Engine',86,'High','Growth',88,30000::numeric,8000::numeric,'Pending'),
  ('Naledi Bright','naledi@brightstone.example','Brightstone Attorneys','Managing Partner','Legal Services','https://brightstone.example','Pretoria, Gauteng','Lead','Referral',79,'Qualified','Growth',84,30000::numeric,8000::numeric,'Pending'),
  ('Maya Daniels','maya@urbanwellness.example','Urban Wellness Studio','Founder','Health & Wellness','https://urbanwellness.example','Cape Town, Western Cape','Proposal','Inbound',92,'High','Premium',91,60000::numeric,16500::numeric,'Pending'),
  ('Ethan Haven','ethan@havenbuild.example','Haven Build Group','Director','Construction','https://havenbuild.example','Durban, KwaZulu-Natal','Lead','Manual',64,'Review','Signature',76,12500::numeric,4500::numeric,'Pending'),
  ('Lerato Green','lerato@greenhaus.example','GreenHaus Café','Owner','Hospitality','https://greenhaus.example','Stellenbosch, Western Cape','Discovery','Website Application',71,'Qualified','Growth',82,30000::numeric,8000::numeric,'Pending')
) as demo(full_name,email,company,position,industry,website,location,lifecycle_stage,lead_source,opportunity_score,opportunity_classification,recommended_service_tier,recommendation_confidence,estimated_setup_value,estimated_monthly_value,client_status)
where not exists (
  select 1 from public.clients existing
  where existing.company = demo.company or existing.normalised_domain = public.ops_normalise_domain(demo.website)
);

