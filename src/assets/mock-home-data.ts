// ================= mock-home-data.ts =================

import { HomeData } from "./home-model";

export const HOME_DATA: HomeData = {
  // ================= STATE CONFIG =================
  stateConfig: {
    stateName: 'Manipur',
    departmentName: 'Revenue Court Case Management System (RCCMS)',
    primaryColor: '#0b5394',
    secondaryColor: '#f58220',
    helpline: '1800-XXX-XXXX',
    email: 'help@manipur.gov.in',
    logoUrl: 'assets/Manipur-Government.png'
  },

  // ================= BANNERS =================
  banners: [
    {
      imageUrl: 'assets/home-banner.jpg',
      title: 'Digital Land Services',
      subtitle: 'Transparent, citizen-centric revenue governance'
    },
    {
      imageUrl: 'assets/manipurlegislativeassembly.jpg',
      title: 'Fast & Secure Applications',
      subtitle: 'Track applications and services online'
    },
    {
      imageUrl: 'assets/sc-manipur-organe.jpeg',
      title: 'Single Unified Portal',
      subtitle: 'All land & revenue services at one place'
    }
  ],

  // ================= HIGHLIGHTS / DASHBOARD STATS =================
  highlights: [
    { title: 'Total Courts', description: '3073', icon: 'account_balance' },
    { title: 'Total Cases', description: '27.39 M', icon: 'gavel' },
    { title: 'Disposed Cases', description: '26.14 M', icon: 'check_circle' },
    { title: 'Pending Cases', description: '1.25 M', icon: 'hourglass_empty' },
    { title: 'Pending (> 1 Year)', description: '0.21 M', icon: 'schedule' },
    { title: 'Pending (> 3 Years)', description: '0.06 M', icon: 'history' },
    { title: 'Pending (> 5 Years)', description: '0.08 M', icon: 'timelapse' },
    { title: 'Un-Updated Cases', description: '0.47 M', icon: 'warning' }
  ],

  // ================= STATISTICS (existing – kept) =================
  statistics: [
    { label: 'Online Services', value: 1280 },
    { label: 'Applications Received', value: 248965 },
    { label: 'Applications Approved', value: 231402 },
    { label: 'Districts Covered', value: 38 }
  ],

  // ================= NOTICES =================
  notices: [
    {
      title: 'Departmental Promotion Committee meeting on 12 Feb',
      date: '12 Feb 2025',
      isNew: true
    },
    {
      title: 'Annual Property Return submission deadline extended',
      date: '01 Feb 2025',
      isNew: true
    },
    {
      title: 'New HRMS module launched',
      date: '25 Jan 2025',
      isNew: false
    }
  ],

  // ================= MENU =================
  menu: [
    { label: 'Dashboard', icon: 'dashboard' },
    {
      label: 'Services',
      icon: 'miscellaneous_services',
      children: ['Land Records', 'Mutation', 'Revenue Courts', 'Certificates']
    },
    {
      label: 'Applications',
      icon: 'assignment',
      children: ['Apply Online', 'Track Status', 'Pending Applications']
    },
    { label: 'Circulars', icon: 'description' },
    { label: 'Help & Support', icon: 'support_agent' }
  ],

  // ================= SERVICES (CARDS / ACCORDION) =================
  services: [
    {
      title: 'Cause List',
      icon: 'event_note',
      open: false,
      items: [{ label: 'Daily Cause List', link: '#' }]
    },
    {
      title: 'Case Status',
      icon: 'query_stats',
      open: false,
      items: [
        { label: 'Computerized No', link: '#' },
        { label: 'Varasat (Uncontested Succession)', link: '#' },
        { label: 'Disputed Plot', link: '#' },
        { label: 'Revenue Village', link: '#' },
        { label: 'Caveat', link: '#' },
        { label: 'Case No', link: '#' },
        { label: 'Filing Year', link: '#' },
        { label: 'Party Name', link: '#' },
        { label: 'Filing Date', link: '#' },
        { label: 'Listing Date', link: '#' },
        { label: 'Act', link: '#' },
        { label: 'New Cases (BOR)', link: '#' }
      ]
    },
    {
      title: 'Court Order',
      icon: 'gavel',
      open: false,
      items: [
        { label: 'Case No', link: '#' },
        { label: 'Date of Order', link: '#' }
      ]
    },
    {
      title: 'Login (BOR)',
      icon: 'login',
      open: false,
      items: [
        { label: 'Login (BOR)', link: '#' },
        { label: 'Mandaliya Sahayak Login', link: '#' }
      ]
    },
    {
      title: 'Login (NT to Commissioner)',
      icon: 'lock',
      open: false,
      items: [{ label: 'Login', link: '#' }]
    },
    {
      title: 'Online Application',
      icon: 'description',
      open: false,
      items: [
        { label: 'Procedure for online application', link: '#' },
        { label: 'Section "34"', link: '#' },
        { label: 'Section "80"', link: '#' },
        { label: 'Varasat (Uncontested Succession)', link: '#' },
        { label: 'Caveat Registration', link: '#' }
      ]
    },
    {
      title: 'Folio',
      icon: 'folder_open',
      open: false,
      items: [{ label: 'Single Window System', link: '#' }]
    },
    {
      title: 'Login (Lekhpal/R.K)',
      icon: 'login',
      open: false,
      items: [
        { label: 'Lekhpal / Revenue Inspector Login', link: '#' },
        { label: 'R.R.K Login', link: '#' }
      ]
    },
    {
      title: 'Chakbandi Court',
      icon: 'gavel',
      open: false,
      items: [{ label: 'Chakbandi Court', link: '#' }]
    }
  ],

  // ================= QUICK SERVICES =================
  quickServices: [
    { title: 'Apply for Mutation', icon: 'assignment' },
    { title: 'View Jamabandi', icon: 'description' },
    { title: 'Track Application', icon: 'track_changes' },
    { title: 'Apply Certificate', icon: 'verified' }
  ],

  // ================= CATEGORIES =================
  categories: [
    { title: 'Land Records', icon: 'map' },
    { title: 'Registration', icon: 'how_to_reg' },
    { title: 'Certificates', icon: 'workspace_premium' },
    { title: 'Grievance', icon: 'support_agent' }
  ],

  // ================= VISION & MISSION =================
  vision: 'To deliver transparent and efficient land governance services.',
  mission: 'Digitize land records and simplify citizen access to revenue services.',

  // ================= WHAT’S NEW =================
  whatsNew: [
    'New dashboard launched for officers',
    'Process automation for mutation cases'
  ],

  marqueeText : [
    'Online services available | Apply digitally | Transparent governance'
  ]
};
