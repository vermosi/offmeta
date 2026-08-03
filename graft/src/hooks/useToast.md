# src\hooks\useToast.ts

- ToasterToast · type · L8-L13 — type ToasterToast = ToastProps & { id: string; title?: React.ReactNode; description?: React.ReactNode; action?: ToastActionElement; };
- genId · function · L17-L20 — function genId()
- Action · type · L22-L26 — type Action = | { type: 'ADD_TOAST'; toast: ToasterToast } | { type: 'UPDATE_TOAST'; toast: Partial<ToasterToast> } | { type: 'DISMISS_TOAST'; toastId?: ToasterToast['id'] } | { type: 'REMOVE_TOAST'; toastId?: ToasterToast['id'] };
- State · interface · L28-L30 — interface State
- addToRemoveQueue · function · L34-L48 — addToRemoveQueue = (toastId: string)
- reducer · function · L50-L101 — reducer = (state: State, action: Action): State
- dispatch · function · L107-L112 — function dispatch(action: Action)
- Toast · type · L114-L114 — type Toast = Omit<ToasterToast, 'id'>;
- toast · function · L116-L143 — function toast({ ...props }: Toast)
- update · function · L119-L123 — update = (props: ToasterToast)
- dismiss · function · L124-L124 — dismiss = ()
- useToast · function · L145-L163 — function useToast()
