import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useRef } from "react";

export const useNavigationContext = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const originPathRef = useRef<string>(location.pathname);

  const captureOrigin = useCallback(() => {
    originPathRef.current = location.pathname;
  }, [location.pathname]);

  const returnToOrigin = useCallback(() => {
    if (originPathRef.current && originPathRef.current !== location.pathname) {
      navigate(originPathRef.current);
    }
  }, [navigate, location.pathname]);

  return {
    captureOrigin,
    returnToOrigin,
    originPath: originPathRef.current,
  };
};
