-- Insert Users
INSERT INTO USERS (user_id, username, password_hash) VALUES
(1, 'john_doe', 'hashed_password_1'),
(2, 'jane_smith', 'hashed_password_2'),
(3, 'mike_wilson', 'hashed_password_3');

-- Insert Jobs for User 1 (John Doe)
INSERT INTO JOBS (job_id, user_id, job_title, is_current) VALUES
(1, 1, 'Software Engineer at Tech Corp', 1),
(2, 1, 'Freelance Web Developer', 1);

-- Insert Jobs for User 2 (Jane Smith)
INSERT INTO JOBS (job_id, user_id, job_title, is_current) VALUES
(3, 2, 'Marketing Manager at Ad Agency', 1),
(4, 2, 'Content Creator', 1);

-- Insert Jobs for User 3 (Mike Wilson)
INSERT INTO JOBS (job_id, user_id, job_title, is_current) VALUES
(5, 3, 'Sales Representative at Retail Co', 1),
(6, 3, 'Part-time Delivery Driver', 1);

-- Insert Sample Shifts for User 1's Jobs
INSERT INTO SHIFTS (shift_id, user_id, job_id, start_time, end_time, total_hours, total_earnings) VALUES
(1, 1, 1, '2024-04-01 09:00:00', '2024-04-01 17:00:00', 8.00, 240.00),
(2, 1, 1, '2024-04-02 09:00:00', '2024-04-02 17:00:00', 8.00, 240.00),
(3, 1, 2, '2024-04-03 19:00:00', '2024-04-03 23:00:00', 4.00, 120.00);

-- Insert Sample Shifts for User 2's Jobs
INSERT INTO SHIFTS (shift_id, user_id, job_id, start_time, end_time, total_hours, total_earnings) VALUES
(4, 2, 3, '2024-04-01 08:30:00', '2024-04-01 17:30:00', 9.00, 270.00),
(5, 2, 3, '2024-04-02 08:30:00', '2024-04-02 17:30:00', 9.00, 270.00),
(6, 2, 4, '2024-04-03 14:00:00', '2024-04-03 18:00:00', 4.00, 100.00);

-- Insert Sample Shifts for User 3's Jobs
INSERT INTO SHIFTS (shift_id, user_id, job_id, start_time, end_time, total_hours, total_earnings) VALUES
(7, 3, 5, '2024-04-01 10:00:00', '2024-04-01 18:00:00', 8.00, 200.00),
(8, 3, 5, '2024-04-02 10:00:00', '2024-04-02 18:00:00', 8.00, 200.00),
(9, 3, 6, '2024-04-03 20:00:00', '2024-04-03 23:00:00', 3.00, 75.00);

-- Insert User Stats
INSERT INTO USER_STATS (user_id, total_hours, total_earnings, last_updated) VALUES
(1, 20.00, 600.00, NOW()),
(2, 22.00, 640.00, NOW()),
(3, 19.00, 475.00, NOW()); 