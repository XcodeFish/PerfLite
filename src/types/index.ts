export interface Error {
    message: string;
    stack: string;
    timestamp: number;
}

export interface PerformanceMetric {
    timestamp: number;
    duration: number;
    resourceName: string;
}

export interface Plugin {
    name: string;
    beforeSend?: (data: any) => void;
    afterSend?: (response: any) => void;
}

export interface VisualizationOptions {
    theme?: 'light' | 'dark';
    maxDataPoints?: number;
    chartType?: string;
}