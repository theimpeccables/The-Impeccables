import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../services/api';

export const usePublicData = (path, { params, initialValue = [] } = {}) => {
  const paramsKey = JSON.stringify(params || {});
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get(path, { params: JSON.parse(paramsKey) })
      .then(({ data: response }) => {
        if (active) setData(response?.data?.items ?? response?.data ?? null);
      })
      .catch((requestError) => { if (active) setError(apiErrorMessage(requestError, 'Unable to load this content right now.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, paramsKey]);
  return { data, loading, error };
};

export const PublicDataState = ({ loading, error, empty, isEmpty = false, children }) => {
  if (loading) return <p className="py-12 text-center text-sm text-gray-400" role="status">Loading…</p>;
  if (error) return <p className="py-12 text-center text-sm text-red-300" role="alert">{error}</p>;
  if (isEmpty && empty) return <p className="py-12 text-center text-sm text-gray-400">{empty}</p>;
  return children;
};
