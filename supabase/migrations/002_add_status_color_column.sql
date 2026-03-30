-- Add status_color column to thesis_check_records table
alter table thesis_check_records
add column status_color text not null default 'red'
check (status_color in ('red', 'orange', 'blue', 'green'));

-- Update existing records to have 'red' as default color
-- (Already set by default, but explicit update for clarity)
update thesis_check_records
set status_color = 'red'
where status_color is null;
