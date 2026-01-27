import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Team from './pages/Team'
import CaseStories from './pages/CaseStories'
import Pricing from './pages/Pricing'
import Booking from './pages/Booking'
import Policies from './pages/Policies'

function App() {
  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/team" element={<Team />} />
        <Route path="/case-stories" element={<CaseStories />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/policies" element={<Policies />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App

