import { useEffect, useRef } from 'react';

/**
 * Hook to bind modal open/close state to the browser / mobile hardware back button.
 * When the modal opens, it pushes a temporary state to the browser history.
 * When the user presses the Android hardware/navigation back button or performs
 * the mobile edge back gesture, the modal closes without navigating away from the page.
 */
export function useModalBackHandler(
  isOpen: boolean,
  onClose: () => void,
  modalName: string = 'modal'
) {
  const isPushedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Push history entry for the open modal
      window.history.pushState({ modalOpen: modalName }, '');
      isPushedRef.current = true;

      const handlePopState = () => {
        // If back was pressed, close the modal
        isPushedRef.current = false;
        onClose();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        // If modal was closed programmatically (e.g. click X or submit), pop the history state
        if (isPushedRef.current && window.history.state?.modalOpen === modalName) {
          isPushedRef.current = false;
          window.history.back();
        }
      };
    }
  }, [isOpen, modalName, onClose]);
}
