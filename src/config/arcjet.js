import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_ENV ==="DRY_RUN"?"DRY_RUN":"LIVE";


if(!arcjetKey){
    throw new Error("ARCJET_KEY is not set in environment variables");
}

export const httpArcjet = arcjetKey?
arcjet({
key:arcjetKey,
rules:[
    shield({mode:arcjetMode}),
    detectBot({
      mode: arcjetMode,
      allow: [
        "Googlebot",
        "Bingbot",
        "Slurp",
        "POSTMAN",
        "CATEGORY:SEARCH_ENGINE",
        "CATEGORY:PREVIEW",
      ],
    }),
    slidingWindow({mode:arcjetMode,interval:'10s',max:50})
]
}):null;

export const wsArcjet = arcjetKey?
arcjet({
key:arcjetKey,
rules:[
    shield({mode:arcjetMode}),
    detectBot({mode:arcjetMode,allow:["CATEGORY:SEARCH_ENGINE","CATEGORY:PREVIEW","POSTMAN",]}),
    slidingWindow({mode:arcjetMode,interval:'2s',max:5})
]
}):null;


export function securityMiddleware(){
    return async(req,res,next)=>{
        if(!httpArcjet){
            return next();
        }
        try{
           const desicion = await httpArcjet.protect(req);

           if(desicion.isDenied()){
               if(desicion.reason.isRateLimit()){
                     return res.status(429).json({
                        error:"Too Many Requests"
                    });
                    }
                    return res.status(403).json({
                        error:desicion.reason
                    });
               }
           }
        catch(error){
            console.error("Arcjet error: ",error);
            return res.status(500).json({
                error:"Internal Server Error"
            });
        }

        next();
    }
}
