const config = {
  appId: 'in.divyadrusti.opticals',
  appName: 'Divya Drusti Opticals',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
