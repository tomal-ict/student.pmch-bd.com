# Popular Medical College — Student & Result Management Portal

A complete, production-ready institutional web portal for **Popular Medical College (Dhanmondi, Dhaka)** built with **React 19 + Vite + Tailwind CSS** on the frontend and **Laravel (PHP 8.2+) + MySQL + Sanctum** on the backend.

Designed for **Zero-Node / Zero-CMD Deployment** — all compiled frontend assets (`assets/`, `index.html`), PHP dependencies (`backend/vendor/`), server rewrite configs (`.htaccess`, `nginx_aapanel.conf`), and database snapshots (`backup/`) are included so the project runs immediately on **XAMPP, cPanel, aaPanel, or any Linux VPS**.

---

## Key Features

### 1. Public Portal
- **MBBS Professional Result Verification (`#lookup`):**
  - Search student results by Registration Number & Academic Session with **2-Factor SMS OTP Verification**.
  - *"Forget Your Number?"* masked mobile hint (displays first 3 and last 3 digits, e.g. `017*****095`).
  - Official printable marksheet view.
- **Online MBBS Admission Form (`#admission`):**
  - **Student Category Selection:** Choose **Local Student** (`1st Migration`, `2nd Migration`, `3rd Migration`, `4th Migration`) or **Foreigner Student** (`Eligible List` number), automatically mapped to the `Government Order` box on the printed form.
  - **Auto Image Compression:** Large photos (10 MB+) are automatically optimized and converted in the browser to clean JPEG files under 2 MB before upload.
  - **Live Grand Total GPA:** Automatically calculates the sum of `GPA without 4th Subject` across entered exams.
  - **Mandatory Mobile OTP Verification:** Sends an SMS OTP formatted as:
    ```text
    Welcome to Popular Medical College.
    Name : {Candidate Full Name}
    Admission OTP : {6-digit OTP}
    ```
    Applications cannot be submitted without confirming the OTP.
  - **Auto-Generated Sequential Admission ID:** Generates structured IDs like `PMC202601`, `PMC202602`, etc. based on the selected session year.
  - **Legal-Size Official Printable Form:** Instant **Legal Portrait (`8.5" × 14"`)** edge-to-edge printable application form with candidate photo.
- **Direct Student Registration (`#register`):**
  - Enroll student records directly with SMS OTP confirmation.
- **Student Self-Service Portal (`#student_portal`):**
  - OTP-authenticated login via Registration Number & Mobile Number, *"Forget Your Number?"* hint, professional exam result entry, and printable marksheet summary.

### 2. Admin Panel (`/myadmin`)
- **Administrative Dashboard:** Live KPI cards, exam distributions, and recent admission activity.
- **Student Records & Exam Results:** Full CRUD management and dynamic professional curriculum marks entry.
- **Admissions Management:**
  - Review, **Edit** (including Local/Foreigner Migration/Eligible List & GPA without 4th Subject), **Approve**, **Reject**, and **Delete** applications.
  - **Single & Bulk Session Print:** Print individual applications or filter by Academic Session and click **Print All** to print every application in Legal Size (`8.5" × 14"`).
  - **Uploaded Documents Serial Viewer & Bulk Print:** Dedicated Documents button opens all uploaded attachments in official serial order (`01`–`12+`) with live preview and one-click **Print All Documents** (A4 portrait).
- **Photo Download Manager:**
  - Dedicated sidebar section to browse all uploaded candidate passport photos, search by **Admission ID** (`PMC202601`), filter by session, download single photos, or **Download All (ZIP)** for a session with every photo automatically named by its Admission ID (e.g., `PMC202601.jpg`, `PMC202602.jpg`).
- **Reports & Export:** Institutional pass-rate summaries and CSV export.
- **Staff Accounts:** Role and granular permission-based access control.
- **System Settings & Data Synchronize:**
  - General Portal Settings, REVE SMS Gateway Configuration, Academic Sessions & Exam Curriculum setup.
  - **Data Synchronize (`System Settings -> Data Synchronize`):**
    - **Backup Database:** Saves full schema + data into `backup/latest_database_sync.json` and a `.sql` dump (automatically replacing old backups so only the latest remains).
    - **Synchronize:** Non-destructively merges missing tables, missing columns, and missing rows into any newly deployed server database.

---

## Project Structure

```text
student_potal/
├── index.php                  # Production entry point (auto-detects base URL & /myadmin)
├── index.html                 # Compiled React production HTML
├── assets/                    # Compiled JS & CSS production bundles
├── .htaccess                  # Root Apache rewrite & FastCGI Authorization header rules
├── nginx_aapanel.conf         # Ready-to-use Nginx / aaPanel URL rewrite configuration
├── backup/                    # Database backup snapshots (.json & .sql) protected by .htaccess
├── backend/                   # Laravel 11 API backend (includes vendor/ & .env)
│   ├── app/
│   ├── config/
│   ├── public/                # Laravel public entry + .htaccess
│   ├── routes/api.php         # API & direct /api/media/* file serving routes
│   └── storage/               # Uploaded photos & admission documents
└── frontend/                  # React + Vite source code (only needed for frontend edits)
```

---

## How to Run & Deploy

### 1. Localhost Setup (XAMPP / WAMP / Laragon)
1. Place or clone the project folder inside your web root (e.g., `htdocs/student_potal`).
2. Start **Apache** and **MySQL**.
3. Create a MySQL database named `student_pmc` (or update `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` in `backend/.env`).
4. Import the database backup from `backup/*.sql` into `student_pmc` via phpMyAdmin (or MySQL CLI):
   ```bash
   mysql -u root student_pmc < backup/database_backup_YYYY-MM-DD_HH-ii-ss.sql
   ```
5. Open the portal in your browser:
   - **Public Portal:** `http://localhost/student_potal/`
   - **Admin Panel:** `http://localhost/student_potal/myadmin`

### 2. Cloud Deployment (cPanel / aaPanel / Linux VPS)
No Node.js or `composer install` is required on the production server.
1. Upload or `git clone` the repository into your domain's web root (e.g., `public_html/` or `/www/wwwroot/yourdomain.com/`).
2. Edit `backend/.env` with your production MySQL credentials and `APP_URL`:
   ```env
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://yourdomain.com

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=your_db_name
   DB_USERNAME=your_db_user
   DB_PASSWORD=your_db_password
   ```
3. Ensure write permissions on `backend/storage/`, `backend/bootstrap/cache/`, and `backup/` (`chmod -R 775`).
4. **Web Server Configuration:**
   - **Apache (cPanel / VPS):** The included `.htaccess` and `backend/public/.htaccess` work out of the box (including `CGIPassAuth On` and `X-Authorization` fallback headers for PHP-FPM/FastCGI).
   - **Nginx (aaPanel / VPS):** Copy the rules from [`nginx_aapanel.conf`](./nginx_aapanel.conf) into **Website -> Site Settings -> URL Rewrite** (or your Nginx `server {}` block).
5. **Database Sync:**
   - Import the initial `.sql` file from `backup/` once, OR log into `https://yourdomain.com/myadmin` -> **System Settings -> Data Synchronize** and click **Synchronize** to automatically create any missing tables/columns and merge data.

### 3. Modifying Frontend Source (Optional)
If you edit React components inside `frontend/src/`:
```powershell
cd frontend
npm install
npm run build
Copy-Item -Path "dist/assets/*" -Destination "../assets/" -Force
Copy-Item -Path "dist/index.html" -Destination "../index.html" -Force
```

---

## About the Developer

**Tomal Krishna Howlader**  
Full-Stack Web & Software Developer

- **Website:** [https://tomal-ict.com/](https://tomal-ict.com/)
- **GitHub Repository:** [https://github.com/tomal-ict/Student-Portal-PMC-.git](https://github.com/tomal-ict/Student-Portal-PMC-.git)
