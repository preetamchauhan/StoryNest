import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './FoodAuth.css';

interface Food {
  id: string;
  name: string;
  emoji: string;
}

// Fallback food options in case API fails
const DEFAULT_FOODS: Food[] = [
  { "id": "chocolate", "name": "Chocolate", "emoji": "🍫" },
  { "id": "vanilla", "name": "Ice Cream", "emoji": "🍦" },
  { "id": "pizza", "name": "Pizza", "emoji": "🍕" },
  { "id": "cookie", "name": "Cookie", "emoji": "🍪" },
  { "id": "cupcake", "name": "Cupcake", "emoji": "🧁" },
  { "id": "strawberry", "name": "Strawberry", "emoji": "🍓" },
  { "id": "banana", "name": "Banana", "emoji": "🍌" },
  { "id": "apple", "name": "Apple", "emoji": "🍎" },
  { "id": "orange", "name": "Orange", "emoji": "🍊" },
  { "id": "mango", "name": "Mango", "emoji": "🥭" },
  { "id": "candy", "name": "Candy", "emoji": "🍬" }
];

const FoodAuth: React.FC = () => {
  const { login, register } = useAuth();
  const [foods, setFoods] = useState<Food[]>(DEFAULT_FOODS);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFoods();
  }, []);

  const fetchFoods = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/foods');
      if (response.ok) {
        const data = await response.json();
        setFoods(data.foods);
      }
    } catch (error) {
      console.error('Failed to fetch foods, using defaults:', error);
    }
  };

  const toggleFood = (foodId: string) => {
    setSelectedFoods(prev =>
      prev.includes(foodId)
        ? prev.filter(id => id !== foodId)
        : [...prev, foodId]
    );
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    if (selectedFoods.length < 3) {
      setError('Please select at least 3 foods');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(username.trim(), selectedFoods);
      } else {
        await register(username.trim(), selectedFoods);
      }
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-100 rounded-xl shadow-lg border-2 border-rainbow" dir="ltr">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          {isLogin ? '🌟 Welcome Back! ' : '🍭 Join Story Nest!'}
        </h2>
        <p className="text-sm text-purple-700 font-medium">
          {isLogin ? '⭐ Name + yummy password! ' : '🍬 Create with tasty foods!'}
        </p>
      </div>

      <div className="space-y-3">
        <div className="bg-white/70 p-3 rounded-lg border border-purple-200">
          <label className="block text-base font-bold text-purple-700 mb-1 flex items-center" dir="ltr">
            <span className="text-lg mr-1">📝</span> Your name?
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error === 'Please enter your name' && e.target.value.trim()) {
                setError('');
              }
            }}
            className="w-full px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-500 bg-white text-left"
            placeholder="Enter name"
            dir="ltr"
            style={{ textAlign: 'left', direction: 'ltr' }}
          />
        </div>

        <div className="bg-white/70 p-3 rounded-lg border border-pink-200">
          <label className="block text-base font-bold text-pink-700 mb-2 flex items-center" dir="ltr">
            <span className="text-lg mr-1">🍔</span> Pick 3+ foods!
          </label>
          <div className="grid grid-cols-4 gap-1">
            {foods.map((food) => (
              <button
                key={food.id}
                onClick={() => toggleFood(food.id)}
                className={`p-2 rounded-lg border-2 transition-all transform hover:scale-105 ${
                  selectedFoods.includes(food.id)
                    ? 'border-green-400 bg-green-100 shadow-md scale-105 ring-1 ring-green-200'
                    : 'border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50'
                }`}
              >
                <div className="text-2xl mb-1">{food.emoji}</div>
                <div className="text-xs font-bold text-gray-700">{food.name}</div>
                {selectedFoods.includes(food.id) && (
                  <div className="text-green-600 text-sm mt-1">✔️</div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center mt-2 p-1 bg-yellow-100 rounded border border-yellow-300">
          <span className="text-lg mr-1">🍴</span>
          <span className="text-sm font-bold text-yellow-800">
            Picked: {selectedFoods.length}/3+
          </span>
          {selectedFoods.length >= 3 && <span className="ml-1">✅</span>}
        </div>

        {error && (
          <div className="p-3 bg-red-100 border-2 border-red-300 rounded-xl flex items-center" dir="ltr">
            <span className="text-red-700 text-base font-medium">{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading || selectedFoods.length < 3 || !username.trim()}
          className="w-full py-2 text-base font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <span className="text-xl mr-2">⏳</span>
              <span className="text-xl">{isLogin ? 'Let’s Go!' : 'Create My Account!'}</span>
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <span className="text-xl mr-2">{isLogin ? '🔑' : '🚀'}</span>
              <span className="text-xl">{isLogin ? 'Login' : 'Create My Account'}</span>
            </span>
          )}
        </button>

        <div className="text-center bg-white/50 p-2 rounded-lg">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSelectedFoods([]);
              setUsername('');
            }}
            className="text-purple-600 hover:text-purple-800 text-sm font-bold flex items-center justify-center mx-auto"
          >
            <span className="text-lg mr-1">{isLogin ? '🌈' : '🔐'}</span>
            {isLogin ? 'New? Create account!' : 'Have account? Login!'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoodAuth;
