import 'dotenv/config';
import app from './app.js';
import { sequelize } from './models/index.js';
/* import { sequelize } from './models'; */
const PORT = process.env.PORT = 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
(async () => {
    try {
        await sequelize.sync();
        console.log('DB synchronised');
        app.listen(PORT, () =>
            console.log('Server launched on http://localhost:${PORT} (env=${NODE_ENV})')
        );
    } catch (err){
        console.log('Error on starting',err);
        process.exitCode=1;
    }
 })();