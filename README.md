#Civic Issue Reporter

A comprehensive crowdsourced civic issue reporting and resolution system designed for the Government. This platform enables citizens to report civic issues like potholes, broken streetlights, waste management problems, and more, while providing administrators with powerful tools to manage and resolve these issues efficiently.

## 🌟 Features

### For Citizens
- **Mobile-First Design**: Responsive interface optimized for smartphones and tablets
- **Easy Issue Reporting**: Simple form with photo upload and GPS location detection
- **Real-Time Location**: Automatic GPS location detection with interactive map
- **Photo Documentation**: Upload photos to provide visual evidence of issues
- **Issue Tracking**: Track the status of reported issues with unique issue IDs
- **Multiple Categories**: Report various types of civic issues (Roads, Lighting, Water, Waste, etc.)

### For Administrators
- **Comprehensive Dashboard**: Real-time analytics and issue management
- **Interactive Map**: Visualize all reported issues on a map with location markers
- **Advanced Filtering**: Filter issues by status, category, priority, and date
- **Issue Management**: Update status, priority, and add administrative notes
- **Analytics Charts**: Visual representation of issue distribution and trends
- **Automated Routing**: Issues automatically assigned to relevant departments
- **Priority Management**: Automatic priority assignment based on issue category

## 🚀 Technology Stack

- **Backend**: Flask (Python)
- **Database**: SQLite (easily upgradeable to PostgreSQL/MySQL)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Maps**: Leaflet.js with OpenStreetMap
- **Charts**: Chart.js for analytics visualization
- **Icons**: Font Awesome
- **Styling**: Modern CSS with gradients and animations

## 📋 Prerequisites

- Python 3.7 or higher
- pip (Python package installer)
- Modern web browser

## 🛠️ Installation & Setup

1. **Clone or Download the Project**
   ```bash
   cd civic-issue-tracker
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application**
   ```bash
   python app.py
   ```

4. **Access the Application**
   - Open your web browser and go to: `http://localhost:5000`
   - Admin Dashboard: `http://localhost:5000/admin`

## 📱 How to Use

### For Citizens

1. **Report an Issue**
   - Fill in your contact information
   - Select the appropriate issue category
   - Provide a clear title and detailed description
   - Add your location (manually or use GPS)
   - Optionally upload a photo
   - Submit the report

2. **Track Your Issue**
   - Note down the unique issue ID provided after submission
   - Use the tracking feature to monitor progress

### For Administrators

1. **Access Dashboard**
   - Navigate to `/admin` to access the administrative interface

2. **View Analytics**
   - Monitor total issues, pending items, and resolution statistics
   - View category distribution charts
   - Analyze trends and patterns

3. **Manage Issues**
   - Filter issues by status, category, or priority
   - Click "View" to see detailed information
   - Update issue status and priority
   - Add administrative notes
   - Track resolution progress

4. **Map View**
   - Visualize all issues on an interactive map
   - Click markers to view issue details
   - Identify problem areas and hotspots

## 🏗️ Project Structure

```
civic-issue-tracker/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # Project documentation
├── templates/            # HTML templates
│   ├── index.html        # Citizen reporting interface
│   ├── admin.html        # Admin dashboard
│   └── report.html       # Individual report view
├── static/              # Static files
│   ├── css/             # Stylesheets
│   ├── js/              # JavaScript files
│   └── uploads/         # Uploaded images
└── civic_issues.db      # SQLite database (created automatically)
```

## 🎯 Key Features Explained

### Automated Department Routing
Issues are automatically assigned to relevant departments based on category:
- **Roads & Infrastructure** → Public Works Department
- **Street Lighting** → Electrical Department
- **Water & Drainage** → Water Supply Department
- **Waste Management** → Sanitation Department
- **Parks & Environment** → Environment Department
- **Traffic & Transportation** → Traffic Police

### Priority Assignment
Issues are automatically prioritized based on their category:
- **High Priority**: Water & Drainage, Roads & Infrastructure, Traffic & Transportation
- **Medium Priority**: Street Lighting, Waste Management
- **Low Priority**: Parks & Environment

### Real-Time Analytics
The admin dashboard provides:
- Total issues count
- Status distribution (Submitted, Acknowledged, In Progress, Resolved)
- Category-wise breakdown
- Department workload analysis
- Interactive charts and visualizations

## 🔧 Customization

### Adding New Categories
1. Update the category options in `templates/index.html`
2. Add corresponding department mapping in `app.py`
3. Update priority mapping if needed

### Modifying Status Workflow
1. Update status options in both frontend templates
2. Modify the database model if needed
3. Update the analytics calculations

### Styling Changes
- Modify the CSS in the `<style>` sections of HTML templates
- Colors, fonts, and layouts can be easily customized
- The design uses CSS Grid and Flexbox for responsive layouts

## 📊 Database Schema

### CivicIssue Table
- `id`: Primary key
- `issue_id`: Unique UUID for tracking
- `title`: Issue title
- `description`: Detailed description
- `category`: Issue category
- `priority`: Priority level (High/Medium/Low)
- `status`: Current status
- `latitude/longitude`: GPS coordinates
- `address`: Location description
- `photo_filename`: Uploaded photo filename
- `citizen_name/phone/email`: Reporter contact info
- `assigned_department`: Responsible department
- `admin_notes`: Administrative notes
- `created_at/updated_at`: Timestamps

## 🔒 Security Considerations

For production deployment, consider:
- Adding user authentication and authorization
- Implementing CSRF protection
- Adding input validation and sanitization
- Using HTTPS for secure communication
- Implementing rate limiting
- Adding proper error handling and logging

## 🤝 Contributing

This project is designed for the Jharkhand government hackathon. Contributions and improvements are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is developed for the Government of Jharkhand hackathon focusing on clean and green technology solutions.

## 📞 Support

For technical support or questions about the system:
- Check the documentation
- Review the code comments
- Test the application thoroughly before deployment
