import { Toaster as SonnerToaster } from 'sonner';

export default function ToasterWrapper() {
  return (
    <SonnerToaster
      duration={3000}
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: 'duality-toast',
          description: 'duality-toast-description',
          icon: 'duality-toast-icon',
        },
      }}
    />
  );
}
