
const SEED = {
  user:{
    name:"RD Sebastião",
    bio:"Autor e leitor apaixonado por histórias intensas.",
    favorites:["depois-de-te-odiar"],
    progress:{"depois-de-te-odiar":3,"era-pra-ser-seu-irmao":2},
    following:12
  },
  books:[
    {
      id:"depois-de-te-odiar",title:"Depois de te odiar",author:"RD Sebastião",
      genre:"Romance",reads:128400,rating:4.9,featured:true,
      description:"Eles cresceram se odiando. Mas o destino tinha outros planos. Megan e Atlas transformaram provocações em rotina durante anos, até perceberem que alguns sentimentos aparecem justamente onde ninguém queria encontrá-los.",
      chapters:[
        {number:1,title:"Sete anos atrás",text:["Nova York parecia grande demais quando Megan tinha oito anos, mas a biblioteca da família fazia o mundo caber dentro de quatro paredes. Era ali que ela conseguia se esconder das vozes, das visitas e principalmente de Atlas Donovan, o garoto que parecia ter transformado irritá-la em uma missão pessoal.","Naquela tarde, Megan estava no chão com um livro aberto sobre as pernas quando ouviu passos conhecidos. Ela não precisou levantar o rosto para saber quem era. Atlas encostou no batente da porta, observou a cena por alguns segundos e sorriu daquele jeito que sempre significava problema.","Ela tentou ignorá-lo. Atlas, como de costume, não aceitou ser ignorado. O que nenhum dos dois sabia era que aquela implicância aparentemente boba seria apenas o começo de uma história que levaria anos para mostrar o que realmente escondia."]},
        {number:2,title:"De volta ao presente",text:["Sete anos mudaram muita coisa. Megan já não era a menina que se escondia atrás de livros enormes, e Atlas já não era apenas o amigo insuportável do irmão dela. Mesmo assim, bastava os dois ficarem no mesmo cômodo para a velha guerra voltar como se nunca tivesse terminado.","O problema era que agora havia algo diferente. As provocações continuavam, os olhares também, mas às vezes o silêncio entre uma resposta e outra durava tempo demais. Megan dizia a si mesma que era irritação. Atlas parecia se divertir em deixá-la acreditar nisso."]},
        {number:3,title:"O convite",text:["Quando o assunto do baile de inverno surgiu, Megan tentou agir como se não se importasse. A ideia de uma noite cheia de gente, música e olhares a deixava nervosa, ainda que ela jamais admitisse isso para Atlas.","Ele fez o convite de um jeito quase casual, como se não estivesse arriscando nada. Megan demorou a responder, estudando o rosto dele em busca de alguma piada escondida. Quando percebeu que Atlas estava falando sério, aceitou antes que pudesse mudar de ideia."]},
        {number:4,title:"Uma escolha difícil",text:["A proximidade entre os dois começou a chamar atenção. Megan insistia que nada havia mudado, mas sua própria reação toda vez que Atlas aparecia tornava a mentira cada vez menos convincente."]}
      ]
    },
    {
      id:"era-pra-ser-seu-irmao",title:"Era Pra Ser Seu Irmão",author:"RD Sebastião",
      genre:"Drama",reads:93400,rating:4.8,
      description:"Helena tenta sobreviver a um relacionamento que diminui cada parte dela. Quando Enzo, o irmão de Caio, começa a enxergar o que todos fingem não ver, a presença dele deixa de ser apenas provocação.",
      chapters:[
        {number:1,title:"Onde tudo aperta",text:["Helena aprendeu a medir palavras, passos e até o volume da própria respiração. Com Caio, qualquer detalhe podia se transformar em discussão. Ela chamava aquilo de cuidado quando precisava explicar para os outros, mas em silêncio começava a perceber que viver com medo não podia ter o mesmo nome que amor."]},
        {number:2,title:"O irmão errado",text:["Enzo aparecia como quem não sabia ficar em silêncio. Provocava, ria e fazia perguntas que Helena não queria responder. Aos poucos, porém, a irritação que ele causava começou a dividir espaço com outra coisa: a sensação desconfortável de estar sendo vista de verdade."]},
        {number:3,title:"A viagem",text:["Quando Caio avisou que viajaria sem saber exatamente quando voltaria, Helena sentiu alívio antes de sentir culpa. Foi a primeira emoção sincera que teve em muito tempo."]}
      ]
    },
    {
      id:"melhor-amigo-marido",title:"O Melhor Amigo do Meu Marido",author:"RD Sebastião",
      genre:"Romance",reads:78600,rating:4.7,
      description:"Valentina ama o marido e acredita conhecer perfeitamente os limites do próprio casamento. Então Dante, o melhor amigo dele, começa a ocupar espaço demais na rotina.",
      chapters:[
        {number:1,title:"Três noites",text:["Valentina não viu problema quando Noah avisou que Dante passaria algumas noites no quarto de hóspedes. Era o melhor amigo do marido, alguém que fazia parte da vida dos dois há tempo suficiente para parecer completamente seguro."]},
        {number:2,title:"Porta destrancada",text:["O constrangimento durou poucos segundos, mas foi suficiente para mudar o clima. Valentina fechou a porta do banheiro assim que percebeu o engano, pediu desculpas e tentou transformar tudo em piada."]},
        {number:3,title:"Curiosidade",text:["Valentina repetiu para si mesma que curiosidade não era desejo e que observar não significava atravessar limite algum. Ainda assim, começou a perceber Dante com atenção demais."]}
      ]
    },
    {
      id:"voce-vai-ceder",title:"Você Vai Ceder",author:"RD Sebastião",
      genre:"Dark Romance",reads:64700,rating:4.6,
      description:"Uma história de tensão, segredos e escolhas que parecem perigosas demais para serem ignoradas.",
      chapters:[{number:1,title:"O começo",text:["A primeira vez que ela percebeu que aquilo havia deixado de ser apenas uma provocação, já era tarde demais para fingir indiferença."]}]
    },
    {
      id:"como-eu-poderia",title:"Como Eu Poderia Não Te Amar?",author:"RD Sebastião",
      genre:"Drama",reads:52600,rating:4.8,
      description:"Ela tentou não sentir. Tentou ir embora. Tentou lembrar de todas as vezes que ele a feriu. Nada disso foi suficiente.",
      chapters:[{number:1,title:"Antes dele",text:["Antes de conhecer o amor, ela conheceu o vazio. Talvez por isso tenha confundido qualquer gesto de cuidado com promessa de permanência."]}]
    },
    {
      id:"depois-da-meia-noite",title:"Depois da Meia-Noite",author:"RD Sebastião",
      genre:"Mistério",reads:41300,rating:4.5,
      description:"Uma mensagem recebida à meia-noite muda tudo o que ela acreditava saber sobre as pessoas ao seu redor.",
      chapters:[{number:1,title:"00:00",text:["O telefone vibrou exatamente à meia-noite. Uma única mensagem apareceu na tela, enviada por um número que ela não reconhecia: não confie em ninguém."]}]
    }
  ]
};
const KEY="entre-capitulos-dark-v1";
function clone(v){return JSON.parse(JSON.stringify(v))}
function getData(){
  try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&x.books)return x}catch(e){}
  localStorage.setItem(KEY,JSON.stringify(SEED));return clone(SEED)
}
function saveData(data){localStorage.setItem(KEY,JSON.stringify(data))}
window.EC={getData,saveData,seed:SEED};
