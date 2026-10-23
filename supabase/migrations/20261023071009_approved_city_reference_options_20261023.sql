begin;
insert into public.master_data_items(category,label,code,sort_order,is_active,metadata)
select 'city',city_name,null,100,true,jsonb_build_object('province',province_name)
from (values
 ('Lahore','Punjab'),('Faisalabad','Punjab'),('Rawalpindi','Punjab'),('Multan','Punjab'),
 ('Gujranwala','Punjab'),('Sialkot','Punjab'),('Sargodha','Punjab'),('Bahawalpur','Punjab'),
 ('Sahiwal','Punjab'),('Sheikhupura','Punjab'),('Jhelum','Punjab'),('Gujrat','Punjab'),
 ('Kasur','Punjab'),('Okara','Punjab'),('Rahim Yar Khan','Punjab'),('Dera Ghazi Khan','Punjab'),
 ('Toba Tek Singh','Punjab'),('Chiniot','Punjab'),('Khanewal','Punjab'),('Vehari','Punjab'),
 ('Karachi','Sindh'),('Hyderabad','Sindh'),('Sukkur','Sindh'),('Larkana','Sindh'),
 ('Peshawar','Khyber Pakhtunkhwa'),('Mardan','Khyber Pakhtunkhwa'),('Abbottabad','Khyber Pakhtunkhwa'),
 ('Quetta','Balochistan'),('Gwadar','Balochistan'),
 ('Islamabad','Islamabad Capital Territory'),('Gilgit','Gilgit-Baltistan'),('Muzaffarabad','Azad Jammu and Kashmir')
) as v(city_name,province_name)
where not exists(select 1 from public.master_data_items m where m.category='city' and lower(trim(m.label))=lower(v.city_name)
and coalesce(m.metadata->>'province','')=v.province_name);
commit;