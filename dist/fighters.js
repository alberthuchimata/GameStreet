/* Initial tuning proposal; values are not yet connected to a combat engine. */
window.fighterDefinitions={
  birrow:{name:'BIRROW',arena:'Ocean Drive',health:1000,height:152,walk:250,retreat:190,jumpVelocity:650,gravity:1800,
    attacks:{jab:{key:'J',damage:35,startup:5,active:3,recovery:9,reach:58},kick:{key:'K',damage:55,startup:9,active:4,recovery:14,reach:86},heavyPunch:{key:'U',damage:80,startup:13,active:4,recovery:22,reach:66},sweep:{key:'I',damage:70,startup:12,active:5,recovery:24,reach:92,knockdown:true}},
    specials:[{name:'Batida Neon',key:'L',classic:'↓ ↘ → + J',damage:90,startup:18,recovery:26,projectileSpeed:380,maxProjectiles:1},{name:'Giro da Pista',key:'O',classic:'↓ ↙ ← + K',damage:100,startup:14,recovery:30,knockdown:true}],
    dash:{key:'Shift',distance:110,duration:12,invulnerable:false},role:'Rápido, alcance curto, pressão e música'},
  halfred:{name:'HALFRED',arena:'Coral Way',health:1000,height:173,walk:215,retreat:170,jumpVelocity:630,gravity:1800,
    attacks:{jab:{damage:40,startup:6,active:3,recovery:11,reach:66},kick:{damage:60,startup:10,active:4,recovery:17,reach:93}},
    specials:[{name:'Carga Rápida',description:'Investida elétrica curta; vulnerável quando bloqueada.',damage:95,startup:17,recovery:30},{name:'Pulso de Bateria',description:'Descarga próxima para conter avanços; sem atravessar a arena.',damage:80,startup:12,recovery:26}],
    cpu:{reactionMs:300,decisionMs:180,maxComboHits:2,readsFutureInputs:false,role:'Aproxima, alterna soco e chute, bloqueia às vezes e deixa pausas para reagir.'}}
};
