import { FinOpsData } from './types';

export interface StateStruct {
    data: FinOpsData | null;
    uploadSession: number;
}

type Listener = (data: FinOpsData | null) => void;
const listeners: Listener[] = [];

export const State = new Proxy<StateStruct>({
    data: null,
    uploadSession: 0
}, {
    set(target, prop, value) {
        // @ts-ignore
        target[prop] = value;
        if (prop === 'data') {
            listeners.forEach(cb => cb(value as FinOpsData | null));
        }
        return true;
    }
});

export const onDataChange = (cb: Listener) => {
    listeners.push(cb);
};
