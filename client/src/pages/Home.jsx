import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { memorialAPI } from '../services/api';
import {
  Heart, User, Calendar, MessageSquare, Shield, CheckCircle
} from 'lucide-react';

export default function Home() {
  const [memorials, setMemorials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemorials();
  }, []);

  const loadMemorials = async () => {
    try {
      const res = await memorialAPI.getAll();
      setMemorials(res.data.memorials);
    } catch (error) {
      console.error('Failed to load memorials:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-blue-100"></div>
          <p className="text-gray-500">Loading memorials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Honor &amp; Remember</h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Create lasting tributes to celebrate the lives of those we hold dear.
            Share memories, light candles, and keep their legacy alive forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/memorials" className="px-8 py-4 bg-white text-blue-900 font-bold rounded-lg hover:bg-blue-50 transition-colors">
              View Memorials
            </Link>
            <Link to="/create" className="px-8 py-4 border border-blue-200 text-blue-100 font-medium rounded-lg hover:bg-blue-500 hover:text-white transition-colors">
              Create Tribute
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard icon={<Heart className="w-6 h-6 text-red-500" />}>
              <h3 className="text-lg font-semibold mb-2">Create Tributes</h3>
              <p className="text-gray-600">Build beautiful memorial pages with photos, stories, and important dates.</p>
            </FeatureCard>
            <FeatureCard icon={<Shield className="w-6 h-6 text-blue-500" />}>
              <h3 className="text-lg font-semibold mb-2">Secure &amp; Private</h3>
              <p className="text-gray-600">Your memories are protected with secure authentication and moderation.</p>
            </FeatureCard>
            <FeatureCard icon={<MessageSquare className="w-6 h-6 text-green-500" />}>
              <h3 className="text-lg font-semibold mb-2">Share Condolences</h3>
              <p className="text-gray-600">Friends and family can leave heartfelt messages and comments.</p>
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* Recent Memorials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Recent Tributes</h2>
            <Link to="/memorials" className="text-blue-600 font-medium hover:underline">View all</Link>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {memorials.length === 0 ? (
              <p className="col-span-full text-center text-gray-500 py-8">No memorials yet.</p>
            ) : (
              memorials.slice(0, 8).map((m) => (
                <Link
                  key={m.id}
                  to={`/memorial/${m.slug}`}
                  className="group block"
                >
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {m.role === 'admin' ? 'Featured' : 'Tribute'}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Heart className="w-4 h-4" /> {m.like_count}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{m.full_name}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">{m.title}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(m.birth_date).toLocaleDateString()} - {m.death_date ? new Date(m.death_date).toLocaleDateString() : 'Present'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>{m.author_name}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, children }) {
  return (
    <div className="p-6 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
        {icon}
      </div>
      {children}
    </div>
  );
}