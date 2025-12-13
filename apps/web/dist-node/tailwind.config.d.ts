declare const _default: {
    content: string[];
    theme: {
        extend: {
            colors: {
                background: {
                    DEFAULT: string;
                    secondary: string;
                    tertiary: string;
                };
                foreground: {
                    DEFAULT: string;
                    muted: string;
                    subtle: string;
                };
                accent: {
                    DEFAULT: string;
                    hover: string;
                    muted: string;
                };
                border: {
                    DEFAULT: string;
                    hover: string;
                };
                success: string;
                warning: string;
                error: string;
            };
            fontFamily: {
                sans: [string, string, string];
                mono: [string, string, string];
            };
            animation: {
                "fade-in": string;
                "slide-up": string;
                "pulse-slow": string;
            };
            keyframes: {
                fadeIn: {
                    "0%": {
                        opacity: string;
                    };
                    "100%": {
                        opacity: string;
                    };
                };
                slideUp: {
                    "0%": {
                        opacity: string;
                        transform: string;
                    };
                    "100%": {
                        opacity: string;
                        transform: string;
                    };
                };
            };
        };
    };
    plugins: never[];
};
export default _default;
