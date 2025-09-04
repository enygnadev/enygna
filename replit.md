# Overview

ENY-GNA (Global Network Architecture) Lab is a comprehensive enterprise management platform built with Next.js, Firebase, and TypeScript. The system provides integrated business solutions including intelligent time tracking, AI-powered help desk, CRM, fleet management, document generation, and financial management. The platform supports multi-tenant architecture with role-based access control for companies, administrators, and employees.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: Next.js 15+ with App Router and TypeScript
- **Styling**: CSS-in-JS with custom CSS variables and Tailwind CSS integration
- **State Management**: React hooks and Context API for authentication and notifications
- **UI Components**: Custom component library with theme support and responsive design
- **Progressive Web App**: PWA capabilities with service workers for offline functionality

## Backend Architecture
- **Database**: Firebase Firestore with real-time synchronization
- **Authentication**: Firebase Auth with role-based access control (superadmin, admin, collaborator)
- **File Storage**: Firebase Storage for documents and images
- **Real-time Features**: Firestore real-time listeners for live updates
- **Multi-tenant**: Company-based data isolation with hierarchical permissions

## Data Storage Solutions
- **Primary Database**: Firebase Firestore with collections for users, companies, sessions, tickets, vehicles, financial documents
- **Caching**: Client-side caching service for performance optimization
- **Backup System**: Automated backup service for data protection
- **Audit Logging**: Comprehensive audit trails for security and compliance

## Authentication and Authorization
- **Authentication Provider**: Firebase Authentication
- **Role Hierarchy**: SuperAdmin > Admin > Manager > Collaborator
- **Permission System**: Granular permissions per system module
- **Session Management**: Secure session handling with token validation
- **Multi-factor Authentication**: Support for enhanced security measures

## System Modules
- **Time Tracking**: GPS-enabled punch system with geofencing and facial recognition
- **Help Desk**: AI-powered ticket system with GPT and Gemini integration
- **Fleet Management**: Real-time vehicle tracking with GPS monitoring
- **Document Generator**: Dynamic document creation with electronic signatures
- **Financial Management**: Accounting and payroll with automated calculations
- **CRM System**: Customer relationship management with sales pipeline

# External Dependencies

## AI and Machine Learning
- **OpenAI GPT**: Advanced ticket analysis and automated responses
- **Google Gemini AI**: Alternative AI provider for natural language processing
- **Facial Recognition**: Client-side image processing for identity verification

## Mapping and Location Services
- **Leaflet**: Interactive maps for location tracking and geofencing
- **React Leaflet**: React components for map integration
- **Browser Geolocation API**: Real-time GPS tracking for mobile devices

## Document Processing
- **jsPDF**: PDF generation for reports and documents
- **jsPDF AutoTable**: Table formatting for structured documents
- **PapaParse**: CSV parsing and export functionality

## UI and Animation
- **Framer Motion**: Advanced animations and transitions
- **Dynamic Imports**: Code splitting for performance optimization
- **Next.js Image**: Optimized image loading and processing

## Date and Time Handling
- **date-fns**: Comprehensive date manipulation and formatting
- **Portuguese Locale**: Localized date formatting for Brazilian market

## Development and Build Tools
- **TypeScript**: Type safety and enhanced developer experience
- **ESLint**: Code quality and consistency enforcement
- **PostCSS**: CSS processing and optimization
- **Autoprefixer**: Cross-browser CSS compatibility

## Firebase Services
- **Firebase SDK**: Core Firebase functionality
- **Firebase Admin**: Server-side Firebase operations
- **Firebase Functions**: Serverless backend functions
- **Real-time Database**: Live data synchronization across clients