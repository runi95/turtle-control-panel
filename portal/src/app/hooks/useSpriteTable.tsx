"use client";

import { useEffect, useState } from "react";

export const useSpriteTable = () => {
  const [data, setData] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetch(`/sprites.map.json`)
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => {
        setError(err.message);
        setError(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return {
    data,
    isLoading,
    error,
  };
};
