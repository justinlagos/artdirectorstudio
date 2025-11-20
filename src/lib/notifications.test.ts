import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { notify } from './notifications';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}));

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notify.success', () => {
    it('should call toast.success with title only', () => {
      notify.success('Success!');
      expect(toast.success).toHaveBeenCalledWith('Success!', undefined);
    });

    it('should call toast.success with title and description', () => {
      notify.success('Success!', 'Operation completed');
      expect(toast.success).toHaveBeenCalledWith('Success!', {
        description: 'Operation completed',
      });
    });
  });

  describe('notify.error', () => {
    it('should call toast.error with title only', () => {
      notify.error('Error!');
      expect(toast.error).toHaveBeenCalledWith('Error!', undefined);
    });

    it('should call toast.error with title and description', () => {
      notify.error('Error!', 'Something went wrong');
      expect(toast.error).toHaveBeenCalledWith('Error!', {
        description: 'Something went wrong',
      });
    });
  });

  describe('notify.info', () => {
    it('should call toast.info with title only', () => {
      notify.info('Info');
      expect(toast.info).toHaveBeenCalledWith('Info', undefined);
    });

    it('should call toast.info with title and description', () => {
      notify.info('Info', 'Additional details');
      expect(toast.info).toHaveBeenCalledWith('Info', {
        description: 'Additional details',
      });
    });
  });

  describe('notify.warning', () => {
    it('should call toast.warning with title only', () => {
      notify.warning('Warning');
      expect(toast.warning).toHaveBeenCalledWith('Warning', undefined);
    });

    it('should call toast.warning with title and description', () => {
      notify.warning('Warning', 'Be careful');
      expect(toast.warning).toHaveBeenCalledWith('Warning', {
        description: 'Be careful',
      });
    });
  });

  describe('notify.loading', () => {
    it('should call toast.loading with title', () => {
      notify.loading('Loading...');
      expect(toast.loading).toHaveBeenCalledWith('Loading...', undefined);
    });

    it('should call toast.loading with title and id', () => {
      notify.loading('Loading...', 'load-1');
      expect(toast.loading).toHaveBeenCalledWith('Loading...', { id: 'load-1' });
    });
  });

  describe('notify.dismiss', () => {
    it('should call toast.dismiss with no id', () => {
      notify.dismiss();
      expect(toast.dismiss).toHaveBeenCalledWith(undefined);
    });

    it('should call toast.dismiss with id', () => {
      notify.dismiss('toast-1');
      expect(toast.dismiss).toHaveBeenCalledWith('toast-1');
    });
  });

  describe('specialized notifications', () => {
    it('should call imageGenerated notification', () => {
      notify.imageGenerated();
      expect(toast.success).toHaveBeenCalledWith('Image generated successfully!', {
        description: 'Your image is ready',
      });
    });

    it('should call imageEdited notification', () => {
      notify.imageEdited();
      expect(toast.success).toHaveBeenCalledWith('Image edited successfully!', {
        description: 'Your changes have been applied',
      });
    });

    it('should call imageSaved notification', () => {
      notify.imageSaved();
      expect(toast.success).toHaveBeenCalledWith('Image saved!', {
        description: 'Image has been saved to your gallery',
      });
    });

    it('should call insufficientCredits notification', () => {
      notify.insufficientCredits();
      expect(toast.error).toHaveBeenCalledWith('Insufficient credits', {
        description: 'Please purchase more credits to continue',
      });
    });

    it('should call copied notification', () => {
      notify.copied();
      expect(toast.success).toHaveBeenCalledWith('Copied to clipboard!', undefined);
    });
  });

  describe('notify.promise', () => {
    it('should call toast.promise with correct messages', async () => {
      const promise = Promise.resolve('data');
      const messages = {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Error!',
      };

      notify.promise(promise, messages);

      expect(toast.promise).toHaveBeenCalledWith(promise, messages);
    });

    it('should handle function-based success message', async () => {
      const promise = Promise.resolve({ name: 'test' });
      const messages = {
        loading: 'Loading...',
        success: (data: { name: string }) => `Loaded ${data.name}`,
        error: 'Error!',
      };

      notify.promise(promise, messages);

      expect(toast.promise).toHaveBeenCalledWith(promise, messages);
    });
  });
});
