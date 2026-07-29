import { useState, useMemo } from 'react';

export const useSearch = (items) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter((item) => (
      item.title.toLowerCase().includes(query) ||
      (item.artist && item.artist.toLowerCase().includes(query)) ||
      (item.album && item.album.toLowerCase().includes(query))
    ));
  }, [items, searchQuery]);

  return { searchQuery, setSearchQuery, filteredItems };
};