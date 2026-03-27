import { useState, useEffect, useCallback } from "react";
import { propertyAPI } from "../services/api";

export const useProperties = (params = {}) => {
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProperties = useCallback(async (fetchParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await propertyAPI.getAll({ ...params, ...fetchParams });
      setProperties(res.data.data);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch properties");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, []);

  return { properties, pagination, loading, error, refetch: fetchProperties };
};

export const useProperty = (id) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    propertyAPI
      .getById(id)
      .then((res) => setProperty(res.data.data.property))
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load property"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  return { property, loading, error };
};
