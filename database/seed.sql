-- Demo data (same records as the original prototype). Every demo account's password is: password123
USE ccgms;
INSERT INTO departments (id,name) VALUES (1,'Hostel & Facilities'),(2,'IT Services'),(3,'Academics'),(4,'Infrastructure');
INSERT INTO categories (id,name,department_id) VALUES (1,'Hostel',1),(2,'Academics',3),(3,'IT & Network',2),(4,'Infrastructure',4),(5,'Library',3),(6,'Mess & Catering',1);
INSERT INTO users (id,name,email,password_hash,role) VALUES
 (1,'Asha Rao','asha.rao@college.edu','$2a$10$UPu5heT9wdPRrrb2e1bs8.KALLVpD7haCEP9Ds9Wa1/4sa7yPzULm','Student'),
 (2,'Kiran Patel','kiran.patel@college.edu','$2a$10$UPu5heT9wdPRrrb2e1bs8.KALLVpD7haCEP9Ds9Wa1/4sa7yPzULm','Student'),
 (3,'Rakesh Menon','r.menon@college.edu','$2a$10$UPu5heT9wdPRrrb2e1bs8.KALLVpD7haCEP9Ds9Wa1/4sa7yPzULm','Officer'),
 (4,'Divya Nair','d.nair@college.edu','$2a$10$UPu5heT9wdPRrrb2e1bs8.KALLVpD7haCEP9Ds9Wa1/4sa7yPzULm','Officer'),
 (5,'Neha Iyer','n.iyer@college.edu','$2a$10$UPu5heT9wdPRrrb2e1bs8.KALLVpD7haCEP9Ds9Wa1/4sa7yPzULm','Admin'),
 (6,'Salim Ahmed','s.ahmed@college.edu','$2a$10$UPu5heT9wdPRrrb2e1bs8.KALLVpD7haCEP9Ds9Wa1/4sa7yPzULm','Officer');
INSERT INTO students (user_id,roll_no) VALUES (1,'21CS042'),(2,'21EC017');
INSERT INTO officers (user_id,department_id) VALUES (3,1),(4,2),(6,3);

INSERT INTO complaints (id,title,description,category_id,priority,status,location,student_id,officer_id,created_at) VALUES
 (1025,'Projector not working in Room 3B','Projector shows no signal.',4,'Low','Resolved','Academic Block',1,3,'2026-08-22 10:00:00'),
 (1028,'Library AC not working, hard to study','AC has been off for days.',5,'Medium','Escalated','Central Library',2,3,'2026-08-29 10:00:00'),
 (1030,'Exam hall seating list not updated','Seating list is outdated.',2,'High','Closed','Exam Cell',1,6,'2026-09-02 10:00:00'),
 (1036,'Mess food quality has declined this month','Quality and hygiene concerns.',6,'Medium','Pending','Central Mess',2,NULL,'2026-09-15 10:00:00'),
 (1039,'Broken tube lights in Room 214','Two tube lights are broken.',4,'Low','Resolved','Hostel Block A',1,3,'2026-09-10 10:00:00'),
 (1041,'Wi-Fi drops every evening in Library annex','Drops between 6 and 9 pm.',3,'Medium','Pending','Library Annex',2,NULL,'2026-09-17 10:00:00'),
 (1042,'No hot water in Block C for a week','No hot water in any bathroom.',1,'High','In Progress','Hostel Block C',1,3,'2026-09-18 10:00:00');

INSERT INTO complaint_status_history (complaint_id,status,note,changed_by,created_at) VALUES
 (1025,'Pending','Submitted by student',1,'2026-08-22 10:00:00'),(1025,'Assigned','Assigned to Rakesh Menon',3,'2026-08-23 10:00:00'),(1025,'Resolved','Marked Resolved',3,'2026-08-25 10:00:00'),
 (1028,'Pending','Submitted by student',2,'2026-08-29 10:00:00'),(1028,'Assigned','Assigned to Rakesh Menon',3,'2026-08-30 10:00:00'),(1028,'Escalated','Escalated — vendor delay',3,'2026-09-05 10:00:00'),
 (1030,'Pending','Submitted by student',1,'2026-09-02 10:00:00'),(1030,'Assigned','Assigned to Salim Ahmed',6,'2026-09-03 10:00:00'),(1030,'Resolved','Marked Resolved — list corrected',6,'2026-09-04 10:00:00'),(1030,'Closed','Closed after student confirmation',5,'2026-09-06 10:00:00'),
 (1036,'Pending','Submitted by student',2,'2026-09-15 10:00:00'),
 (1039,'Pending','Submitted by student',1,'2026-09-10 10:00:00'),(1039,'Assigned','Assigned to Rakesh Menon',3,'2026-09-11 10:00:00'),(1039,'In Progress','Marked In Progress',3,'2026-09-13 10:00:00'),(1039,'Resolved','Marked Resolved — fixtures replaced',3,'2026-09-14 10:00:00'),
 (1041,'Pending','Submitted by student',2,'2026-09-17 10:00:00'),
 (1042,'Pending','Submitted by student',1,'2026-09-18 10:00:00'),(1042,'Assigned','Assigned to Rakesh Menon',3,'2026-09-19 10:00:00'),(1042,'In Progress','Marked In Progress — plumber scheduled',3,'2026-09-21 10:00:00');

INSERT INTO complaint_comments (complaint_id,user_id,body,created_at) VALUES
 (1042,3,'Plumbing team visiting tomorrow morning.','2026-09-21 10:00:00'),
 (1039,3,'Replaced two tube lights, tested working.','2026-09-14 10:00:00'),
 (1030,6,'Corrected seating list published on notice board.','2026-09-04 10:00:00'),
 (1028,3,'Vendor part delayed, escalating to admin for approval.','2026-09-05 10:00:00');
INSERT INTO feedback (complaint_id,rating,comment) VALUES (1030,5,'Fixed quickly, thank you.');
