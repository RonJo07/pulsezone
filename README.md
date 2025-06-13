# 🎮 Pulse - A Tap Timing Game

A modern, engaging tap timing game built with React and FastAPI. Test your reflexes and timing skills in this addictive game!

[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-orange)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.3-38B2AC)](https://tailwindcss.com/)

## 🌟 Features

- 🎯 Precise tap timing gameplay
- 🏆 Global leaderboard system
- 🏅 Achievement system
- 🌙 Dark/Light mode
- 📱 Progressive Web App (PWA) support
- 🎵 Immersive sound effects
- 📊 Performance analytics
- 🔒 Secure user authentication

## 🚀 Live Demo

Play the game at: [Pulse Game](pulsezone-game.vercel.app)

## 👨‍ Developer

Created by [Ron](https://techwithron.co.in)
- Portfolio: [techwithron.co.in](https://techwithron.co.in)
- GitHub: [https://github.com/RonJo07]

## 🛠️ Tech Stack

### Frontend
- React 18.2.0
- Tailwind CSS 3.3.3
- Progressive Web App (PWA)
- Service Workers for offline support

### Backend
- FastAPI 0.104.1
- Python 3.11
- Supabase for database
- RESTful API architecture

## 📋 Prerequisites

- Node.js (v14 or higher)
- Python 3.11
- npm or yarn
- Git

## 🚀 Installation

1. Clone the repository:
```bash
git clone [pulse-game](https://github.com/yourusername/pulse-game.git)
cd pulse-game
```

2. Set up the frontend:
```bash
cd frontend
npm install
# or
yarn install
```

3. Set up the backend:
```bash
cd backend
python -m venv venv
# On Windows
venv\Scripts\activate
# On Unix or MacOS
source venv/bin/activate
pip install -r requirements.txt
```

4. Configure environment variables:

Frontend (.env):
```
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=http://localhost:8000/api
```

Backend (.env):
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

## 🎮 Running the Application

1. Start the backend server:
```bash
cd backend
uvicorn server:app --reload
```

2. Start the frontend development server:
```bash
cd frontend
npm start
# or
yarn start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## 🎯 Game Features

### Core Gameplay
- Tap targets as they appear
- Score points based on timing accuracy
- Combo multiplier system
- Lives system with visual feedback

### User Features
- Anonymous user tracking
- High score tracking
- Achievement system
- Dark/Light mode toggle

### Social Features
- Global leaderboard
- Achievement sharing
- Performance statistics

## 🎯 API Endpoints

### User Management
- `POST /api/users` - Create new user
- `GET /api/users/{user_id}` - Get user details

### Game Sessions
- `POST /api/sessions` - Create game session
- `GET /api/sessions/{user_id}` - Get user sessions

### Leaderboard
- `GET /api/leaderboard` - Get global leaderboard
- `POST /api/leaderboard` - Submit new score

## 🔒 Security Features

- Secure API endpoints
- Environment variable protection
- Supabase authentication
- Rate limiting
- CORS protection

## 🛠️ Development Features

- Hot reloading
- Error boundaries
- Performance monitoring
- Service worker for offline support
- Responsive design

## 📱 PWA Features

- Offline support
- Installable on devices
- Push notifications
- Background sync
- App-like experience

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- FastAPI team for the powerful backend framework
- Supabase team for the database solution
- All contributors and supporters

## 📞 Contact

For any queries or support, please reach out:
- Website: [techwithron.co.in](https://techwithron.co.in)
- Email: [ronjomarch2024@gmail.com]
- LinkedIn: [https://www.linkedin.com/in/ron-jo-linkme]

---
Made with ❤️ by [Ron](https://techwithron.co.in)
