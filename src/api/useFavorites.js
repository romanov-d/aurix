import { useState, useEffect, useCallback } from 'react';
import { api } from './client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState(new Set());

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites(new Set());
      return;
    }
    try {
      const list = await api('/me/favorites');
      setFavorites(new Set(list));
    } catch (e) {
      console.error('Failed to fetch favorites', e);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (carId) => {
    if (!user) return false;
    const isFav = favorites.has(carId);
    
    // optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(carId);
      else next.add(carId);
      return next;
    });

    try {
      if (isFav) {
        await api(`/me/favorites/${carId}`, { method: 'DELETE' });
      } else {
        await api(`/me/favorites/${carId}`, { method: 'POST' });
      }
      return true;
    } catch (e) {
      // rollback on error
      fetchFavorites();
      throw e;
    }
  };

  return { favorites, toggleFavorite };
}
