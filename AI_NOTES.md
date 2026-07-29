


AI TOOL I USED-> CLAUDE MODEL SONNET4.5  WEB CHAT and  Antigravity for debuggig

                I Split Project into 4 phases

Phase 1-> Configuraing discord auth creds from discord developer poratl and my own discord  and  getting familier with discord's
connection and authentication flow (registeing /interaction endpoint in dveloper portal after hostig minal backend containng /interaction endpoint ) 

Phase 2-> Desinging the db and backend 

Phase 3-> Extentended to deliver the extras and giving prodcut a actual usecase

Phase 4 ->Testing 


                Some architectural decision i make 

1--Using my old backend proactices in code to make it more modular like using proper util, validation,scripts,controler-service pattern,backend based pagination etc etc  correct design patterns that i used in production code 

2--I didnt make resolve and claim button in secind server 
so i am only mirroring that ai respsoses i secind server no actions there , i did this beacuse  webhook message cannot carry button etc so only an ai genrted respose in send there

3-- I used an md of my own backend_best_architectural.md (didnet add in git as its contain some confidential pattern and folder names relevent to production i work on)patterns that i used for prodcution grade backend made in typscipt(nodejs) environemnt 


                 Bug i solved that i faced while using ai

Ai's smoke test did delete process.env.DATABASE_URL to force the in-memory store, but dotenv loads later and silently re-filled it from .env - so my "isolated" tests were actually writing junk into my real neon db, and one test even disabled /report in production and left it off. i caught it when a fresh test run said "this command was already processed" - impossible for a clean in-memory store. the fix: set DATABASE_URL="" instead of deleting it (dotenv never overrides an existing var, even empty) + zod treating empty string as unset. lesson: tests passing is not the same as tests being isolated.





               If i ahd more time i would give it more shape

-each user can have thier own admin panel to manage my bot currenlty (only one)
-curenlty any memeber can click claim and resove i will give this power to only support guy 








