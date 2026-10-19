import { NameBank, NameGroup } from "../schemas/people-pool.js";
import { NAME_BANKS } from "./name-banks.js";
// Traditions that used to share a bank with a neighbor they do not name
// people like.
//
// One bank served Russia and Ukraine, so a Ukrainian minister was called
// Kirill and a Russian one Kyrylenko. One served five Central Asian republics,
// so a Tajik carried a Kazakh given name. One served every Arab state, so an
// Emir of Kuwait carried a Levantine Christian surname and the Maldives drew
// from the Levant. The Indonesian bank named Malaysia's and Brunei's people
// with Javanese given names and Batak clan names, South Africa's bank put an
// Afrikaans given name in front of a Zulu surname, and Nigeria's put a Yoruba
// given name in front of an Igbo one. Each tradition here is one people's own,
// and a nation draws only from the traditions its people actually carry.
//
// These are authored from the naming conventions of each tradition, the way
// the other authored banks are: given names of the generation now in public
// life, and family, clan or father's names in the form that tradition writes
// them. No list holds the name of anyone who has led these governments; the
// real-name and leader-surname guards refuse any pairing that would anyway.
const words = (text) => text.trim().split(/\s+/);
/** A list whose entries may hold a space, as "Van der Merwe" does, separated by commas instead. */
const listed = (text) => (text.includes(",") ? text.split(",").map((entry) => entry.trim().replace(/\s+/g, " ")) : words(text));
/**
 * A group from its lists. A patronymic tradition carries no family name: its
 * second name is a father's given name, so its "surname" list is its own
 * men's names.
 */
/** A tradition's list names each person once; a repeat is a typing slip that doubles one name's odds. */
function distinct(id, kind, list) {
    const seen = new Set();
    for (const name of list) {
        if (seen.has(name))
            throw new Error(`the ${id} ${kind} list carries ${name} twice`);
        seen.add(name);
    }
    return [...list];
}
function group(id, lists, form) {
    const masculine = distinct(id, "masculine", words(lists.masculine));
    const fathers = form === "patronymic" || form === "malay-patronymic" || form === "mauritanian-patronymic";
    return NameGroup.parse({
        id,
        ...(form ? { form } : {}),
        given: {
            masculine,
            feminine: distinct(id, "feminine", words(lists.feminine)),
            neutral: distinct(id, "neutral", words(lists.neutral)),
        },
        surname: fathers ? masculine : distinct(id, "surname", listed(lists.surname ?? "")),
    });
}
/**
 * Russian names: the east Slavic bank as Russia writes it, without the
 * Ukrainian family names (-enko, -chuk, -uk) it also carried. A Ukrainian
 * surname does occur in Russia, but a bank that leads with them names a
 * Russian cabinet from the wrong side of the border.
 */
const SLAVIC_EAST = NAME_BANKS["slavic-east"].groups[0];
const UKRAINIAN_FORM = /(?:enko|chuk|iuk|yuk|uk|ko|ets|ynyk|yshyn|yn)$/;
const RUSSIAN = NameGroup.parse({
    ...SLAVIC_EAST,
    id: "russian",
    given: {
        ...SLAVIC_EAST.given,
        masculine: SLAVIC_EAST.given.masculine.filter((name) => !/^(?:Oleksandr|Oleksi|Ostap|Taras|Danilo|Zinoviy)$/.test(name)),
    },
    surname: SLAVIC_EAST.surname.filter((name) => !UKRAINIAN_FORM.test(name) || /(?:ov|ev|in)$/.test(name)),
});
const UKRAINIAN = group("ukrainian", {
    masculine: `
    Oleksandr Serhiy Andriy Dmytro Oleksiy Mykola Volodymyr Yuriy Ihor Vasyl Oleh Mykhailo Viktor Petro Ivan Taras
    Bohdan Yaroslav Roman Vitaliy Anatoliy Yevhen Pavlo Stepan Maksym Denys Ruslan Vadym Artem Kostiantyn Hryhoriy
    Borys Valeriy Leonid Fedir Semen Arsen Danylo Nazar Ostap Orest Markiyan Illia Kyrylo Myroslav Sviatoslav
    Rostyslav Zinoviy Vsevolod Yosyp Heorhiy Tymofiy Vladyslav Stanislav Hennadiy Viacheslav Matviy Yakiv Lev Ihnat
    Klym Lukian Omelian Pylyp Sava Trokhym Yulian Zakhar Mstyslav`,
    feminine: `
    Olena Iryna Tetiana Nataliia Svitlana Olha Hanna Halyna Kateryna Mariia Yuliia Anastasiia Liudmyla Oksana
    Viktoriia Larysa Nadiia Valentyna Lesia Inna Khrystyna Solomiia Oleksandra Yaroslava Zoriana Uliana Myroslava
    Daryna Sofiia Veronika Alina Diana Yana Marta Liliia Nina Raisa Tamara Vira Liubov Zinaida Alla Maryna Ivanna
    Bohdana Stefaniia Roksolana Taisiia Vasylyna Yevheniia Polina Karyna Kira Emiliia Anhelina Snizhana Olesia
    Dariia Ruslana Nelia Rimma Zlata Orysia Oresta Vladyslava`,
    neutral: `
    Sasha Zhenia Valia Slava Vitia Tolia Dima Yura Kolia Sania Petia Vasia Tosia Nadia Liuba Marusia Hania Olia
    Stasia Yasia Oles Yarema Ivanko Stefko Danko Yarko Mykolka Tarasyk Levko Romko Hrytsko Vlasko`,
    surname: `
    Shevchenko Kovalenko Bondarenko Tkachenko Kravchenko Kovalchuk Boiko Oliinyk Shevchuk Koval Polishchuk Bondar
    Tkachuk Moroz Marchenko Lysenko Rudenko Savchenko Petrenko Klymenko Pavlenko Kuzmenko Ponomarenko Vasylenko
    Levchenko Kharchenko Karpenko Havryliuk Melnyk Kostenko Zinchenko Yakovenko Sydorenko Mazur Fedorenko Prykhodko
    Moskalenko Hrytsenko Ostapenko Nazarenko Honcharenko Dmytrenko Stepanenko Ivanenko Didenko Hordiienko Shapoval
    Lytvynenko Babenko Yurchenko Demchenko Panchenko Yatsenko Mykhailenko Hnatiuk Kovalyshyn Hrynyshyn Kuzyk Stasiuk
    Senyk Romaniuk Martyniuk Andriichuk Savchuk Semeniuk Kostiuk Fedoruk Sydoruk Pavliuk Vakulenko Humeniuk
    Levytskyi Kovalskyi Sokolovskyi Zabolotnyi Kozak Kushnir Kolomiiets Palamarchuk Voloshyn Holub Dovhan Chornyi
    Bilyk Pylypenko Ostrovskyi Tymchenko Dudnyk Hlushchenko Zaiets Horbenko Chumak Kyrychenko Mazurenko Tarasenko
    Onyshchenko Serdiuk Kulyk Stetsenko Vlasenko Datsenko Nechyporenko Lozynskyi Hrabovskyi Hnatenko Zhuk Kravets
    Tkach Petryshyn Shvets Kolesnyk Popovych Vovk Chaika Kobzar`,
});
const KAZAKH = group("kazakh", {
    masculine: `
    Nurlan Yerlan Askar Bolat Serik Marat Daniyar Aidos Nurzhan Kairat Almas Arman Timur Yerzhan Galym Dauren Asset
    Berik Kanat Zhanibek Olzhas Talgat Yerbol Azamat Beibut Aibek Bauyrzhan Dias Daulet Kuanysh Sanzhar Saken Sabit
    Temirlan Yesbol Zhandos Zhasulan Bekarys Abay Bekzhan Berdibek Kairbek Kuandyk Nurdaulet Nurtai Aslan Bakhtiyar
    Madi Dulat Yermek Rauan Alibek Nurbolat Zhomart Samat Adil Didar Zhenis Mukhtar Serikbol Amanzhol Yerzhigit
    Aidar Rustem Yerkin`,
    feminine: `
    Aigerim Aizhan Dana Gulnara Saule Dinara Aliya Zhanar Assel Madina Aruzhan Aida Gaukhar Zhuldyz Ainur Laura
    Botagoz Kamila Akmaral Ayaulym Akbota Altynai Anara Aigul Aidana Bibigul Elmira Gulmira Gulzira Gulbanu Indira
    Karlygash Marzhan Meruert Moldir Nazerke Nurgul Saltanat Shynar Symbat Tomiris Zarina Zhaniya Zere Ainagul Balnur
    Gulnaz Nurai Aisulu Dilnaz Kuralai Raushan Saniya Togzhan Ulzhan Zhibek Zhansaya Aiym Dilyara Asem Aknur Anel
    Arailym Bayan Gulsim Kunsulu`,
    neutral: `
    Ayan Erke Zhan Aidyn Nurdan Sayan Tair Tanat Turar Zhanel Dinislam Gulim Iman Aybar Beknur Erzat Nurlybek
    Bekzada Damir Bekaidar Dilnur Orken Yerdaulet Zhandar Aibar Bekasyl Aisezim Nurasyl Erasyl Nurali`,
    surname: `
    Akhmetov Abenov Omarov Suleimenov Zhakupov Seitkali Iskakov Kenzhebekov Abdrakhmanov Utemisov Kaliyev
    Serikbayev Sarsenbayev Baimukhanov Temirbekov Nurmagambetov Zhumabayev Beisenov Ermekbayev Zhaksybekov Kassymov
    Kuanyshev Tulegenov Bekmukhanbetov Dosmukhambetov Esimov Kozhabekov Kuandykov Kudaibergenov Kulmagambetov
    Kuzembaev Musabekov Nurgaliev Nurpeisov Orazbekov Shaimerdenov Tastanbekov Tleuov Toktarov Yergaliyev Yeraliyev
    Zhanabekov Zharkynbekov Zhumagulov Aitkulov Baitursynov Daulbayev Yessenov Mukanov Nurkenov Ospanov Sadvakasov
    Seitov Shayakhmetov Uskenbayev Zhanuzakov Aubakirov Baibolov Kenzhetayev Mukhametzhanov Turgumbayev Zhakenov
    Abilov Amanzholov Rakhimzhanov Karakozov Kairbekov Nurlanov Zhylkybayev Temirkhanov Myrzakhmetov Serikov
    Bekturganov Almukhanov Taubaev Yerzhanov`,
});
const UZBEK = group("uzbek", {
    masculine: `
    Alisher Bakhtiyor Sardor Jasur Rustam Dilshod Sherzod Ulugbek Otabek Farrukh Aziz Rashid Botir Murod Anvar
    Jamshid Akmal Nodir Timur Bekzod Umid Sanjar Bakhrom Ilhom Komil Zafar Zohid Shukhrat Bahodir Farhod Gayrat
    Rasul Rovshan Samandar Sirojiddin Abbos Akbar Asadbek Behruz Davron Doniyor Elyor Erkin Hamid Husan Ibrohim
    Jahongir Kamoliddin Khurshid Lazizbek Mansur Muzaffar Nurillo Oybek Rahim Sobir Temur Ulmas Valijon Yorqin
    Zokir Azizbek Shohruh Mirzo`,
    feminine: `
    Dilnoza Nigora Gulnora Malika Zarina Shahnoza Feruza Nodira Sevara Kamola Dildora Madina Mohira Gulchehra
    Mukhayyo Nilufar Saida Munisa Gulnoza Malohat Muhabbat Nargiza Ozoda Shirin Zilola Zebo Zulfiya Yulduz Gulbahor
    Gulrukh Iroda Kumush Nafisa Umida Barno Dilafruz Durdona Farangiz Gavhar Hilola Kamila Laylo Maftuna Mahliyo
    Marjona Mavluda Nasiba Robiya Sabohat Sarvinoz Shahzoda Shoira Charos Dilorom Gulshan Mehriniso Nozima Parvina
    Sitora Yodgora Zuhra Zamira`,
    neutral: `
    Nur Oydin Iqbol Dilnur Sanobar Ruxsat Ozod Rayhon Nurali Shodlik Bahor Yulduzxon Sabo Mehr Ulfat Nazokat Orzu
    Saodat Baxt Zafarxon Nigor Farog Tolib Nurxon Diyor Nuriddin Ixlos Sadoqat Munavvar Ma'rifat`,
    surname: `
    Yusupov Rakhimov Abdullayev Ismoilov Nazarov Sultanov Rashidov Umarov Khodjayev Usmanov Kholmatov Saidov
    Tursunov Ergashev Mirzaev Alimov Juraev Khasanov Nurmatov Kadyrov Sobirov Salimov Toshmatov Yuldashev Mahmudov
    Azimov Rahimov Gulyamov Norboyev Abdurakhmonov Sharipov Bakirov Ikramov Shomurodov Alijonov Gafurov Haydarov
    Ganiev Ahmedov Jalilov Kurbanov Sabirov Fayzullaev Ismailov Kamilov Masharipov Nurmanov Qurbonov Rustamov Aminov
    Boboyev Davletov Egamberdiev Fozilov Hamidov Jumaniyozov Khamraev Latipov Mamatkulov Nishonov Otajonov Qodirov
    Samadov Tojiev Usarov Valiev Yakubov Zokirov Karimov`,
});
const TAJIK = group("tajik", {
    masculine: `
    Firdavs Rustam Sherali Davlat Zafar Parviz Khurshed Farhod Jamshed Faridun Umed Bakhtiyor Mahmadali Suhrob
    Behruz Shohrukh Saidmurod Abdullo Nurullo Qosim Ismoil Muhammadjon Alijon Amirjon Anvar Asliddin Azizjon Bahrom
    Daler Dilovar Firuz Hasan Hotam Ikrom Jahongir Kamol Karim Mahmud Manuchehr Mirzo Nasim Nazar Negmat Nodir Olim
    Rahmatullo Rajab Saidali Salim Shamsiddin Shodmon Siyovush Sobir Sorbon Tolib Usmon Yusuf Zarif Zokir Abdurahmon
    Bobojon Davron Fayzullo Ghafur Hamid`,
    feminine: `
    Zarina Nigina Farangis Mehrangez Sitora Dilafruz Malika Parvina Gulnora Tahmina Shahnoza Firuza Munira Manizha
    Nilufar Gulchehra Madina Mavjuda Mehrona Nasiba Nodira Ozoda Rukhshona Sabohat Sarvinoz Shabnam Shirin Tamanno
    Zebo Zuhro Barno Dilnoza Farzona Gulbahor Gulrukhsor Hilola Jamila Kamola Latofat Mohira Muhabbat Nargis Parisa
    Rano Rukhsora Saida Sanavbar Sevara Sohiba Surayo Zulaykho Mahina Marjona Nigora Oisha Roziya Shahlo Zamira
    Munisa Firdavsiya Gulandom Mastona`,
    neutral: `
    Orzu Nur Mehr Umeda Navruz Bahor Farrukh Shodi Iqbol Baxt Nurafshon Sabo Oftob Dilnur Somon Sitorai Farog Ruzi
    Parvoz Ormon Nazokat Nekruz Saodat Shabboz Payvand Diyor Vafo Guldasta Sarvar Anor`,
    surname: `
    Qahhorzoda Saidzoda Sharifzoda Davlatzoda Mahmadzoda Nazarzoda Karimzoda Ismoilzoda Qodirov Saidov Rahimov Nurov
    Abdulloev Sharipov Safarov Rajabov Hakimov Mirzoev Nazarov Ghafurov Hamroev Latipov Saidmurodov Faizulloev Asoev
    Boboev Davlatov Ergashev Faizov Gulov Haydarov Ibrohimov Jumaev Karimov Kholov Mahmudov Mirzozoda Naimov Odinaev
    Olimov Qurbonov Rustamov Salimov Sattorov Shukurov Sobirov Sultonov Toshev Umarov Usmonov Yusufzoda Zokirov
    Aminzoda Bobozoda Hasanzoda Jalolzoda Kholzoda Nurzoda Rahimzoda Sadulloev Tagoev Zuhurov Alizoda Ashurov`,
});
const KYRGYZ = group("kyrgyz", {
    masculine: `
    Almaz Kubanychbek Nurlan Bakyt Azamat Mirlan Tilek Aibek Ulan Kanybek Taalaibek Bektur Chyngyz Nurbek Adilet
    Ermek Emil Daniyar Kylychbek Temirlan Zhyrgalbek Talant Manas Mederbek Rysbek Marlen Asylbek Askat Meder
    Beknazar Bolot Eldiyar Erlan Jyldyzbek Kalys Kanat Maksat Melis Nurzhigit Ruslan Sanzhar Sultan Tologon
    Toktogul Ulukbek Urmat Zhoomart Dastan Aibar Aktan Arstan Bakai Belek Duishon Ernis Iskender Kairat Kuban Marat
    Nurdin Samat Suiunbek Tynchtyk Zamir`,
    feminine: `
    Aizada Aida Gulnara Ainura Cholpon Zhyldyz Aigul Elnura Meerim Nazira Bermet Asel Kanykei Altynai Begimai
    Aichurek Aikanysh Aisuluu Damira Gulzat Jibek Kanyshai Nurzat Perizat Salkyn Venera Zamira Aigerim Aijan
    Ainagul Aiperi Akylai Aselia Baktygul Burul Chynara Dinara Elmira Gulmira Gulnaz Jamilya Kalima Kunduz Madina
    Mairam Mira Nargiza Nurgul Saikal Sezim Tolgonai Nurjamal Aidana Aisha Bubusara Gulsara Jyldyz Ulara Kyial
    Asylkan Gulaiym Nazgul`,
    neutral: `
    Nur Aibar Bekzat Erke Meder Nurdan Sezim Aian Aidai Tilek Kanat Kuban Aiturgan Zhanyl Nurai Ainur Aizat Adis
    Aruu Bakyt Bolot Eliza Jyldyz Kalys Mirbek Nurik Sanjar Tynar Umut Zhiyde`,
    surname: `
    Toktogulov Isakov Abdyldayev Asanov Mamytov Osmonov Sultanbekov Zhumabekov Imanaliyev Sarbagyshev Beishenaliev
    Kadyrbekov Toktomushev Maratov Kurmanaliev Abdrakhmanov Musaev Dzhumaliev Turdumambetov Mambetaliev Omurbekov
    Bekbolotov Cholponov Dzhusupov Kambarov Madumarov Sadyrov Toichubekov Turgunbaev Abdykadyrov Alymkulov Arykov
    Asylbekov Baktybekov Bolotbekov Chotonov Duishenbiev Egemberdiev Ibraimov Isabekov Jumabaev Kalybekov Kasymov
    Kochkorov Kurmanov Mamatov Mukanbetov Nurmatov Orozbekov Sagynbaev Seitov Shamshiev Suerkulov Tashbaev Tokoev
    Turdubaev Usenov Zhakypov Akmatov Bakirov Chynybaev Dzholdoshev Esenaliev Kalmatov Mamyrov`,
});
const TURKMEN = group("turkmen", {
    masculine: `
    Myrat Batyr Merdan Dovlet Rustem Maksat Arslan Begench Yazmyrat Ata Ovez Nury Dayanch Shatlyk Kakajan Hojamyrat
    Bayram Allaberdi Annamyrat Atajan Babageldi Begmyrat Berdi Charyyar Dowletmyrat Durdy Eziz Gadam Gurban Guwanch
    Gylych Hally Hydyr Ilaman Jeyhun Kemal Kerim Mekan Meret Muhammet Nazar Orazgeldi Orazmyrat Parahat Rahym Rejep
    Resul Sapar Shamyrat Shiraly Suleyman Tahyr Tagan Toyly Yagshy Yhlas Yolbars Yusup Agajan Amanmyrat Ashyr
    Bagtyyar Dowran Hemra Myratgeldi Oraz Perhat Sahyt Tachmyrat Wepa`,
    feminine: `
    Ogulgerek Aygul Maral Gozel Jeren Selbi Leyli Ogulbossan Sona Bahar Ayna Gulshat Mahri Enejan Akgul Altyn
    Amangul Aynur Ayjemal Bagul Bibi Dunya Gulalek Gulbahar Gulnara Jemal Lale Mahym Maysa Merjen Nabat Nurjemal
    Ogulnabat Ogulshirin Oguljemal Ogulsona Owadan Ruhsat Sabyrgul Sapargul Selbigul Shirin Tavus Tazegul Yazgul
    Zuleyha Arzuw Aysoltan Bossan Gunche Guljahan Hurma Jahan Kumush Mahrijemal Nazik Ogulbibi Ogulmaral Gulnabat
    Sulgun Tuwak Aknabat`,
    neutral: `
    Nur Bagt Arzuw Yagty Ynam Mylayym Bahar Gunesh Ay Altyn Sahy Ruhy Sona Yyldyz Dowlet Nurly Pena Gozel Shatly
    Nesip Umyt Nazly Yashyl Kerwen Ylham Owaz Jeyhun Serpay Mekan Arzuly`,
    surname: `
    Hojamuhammedow Atayew Myradow Orazow Annayew Gurbanow Amanow Nurmuradow Durdyyew Hojayew Rejepow Babayew
    Garayew Berdiyew Allaberdiyew Charyyew Saparow Tashliyew Yazkuliyew Bayramow Ovezow Agayew Akmyradow
    Allanazarow Annamyradow Ashyrow Atabayew Baylyyew Begenjow Charyyarow Dowletow Durdymyradow Gadamow Gylyjow
    Hallyyew Hudayberdiyew Ilamanow Jumayew Kakabayew Kerimow Mammedow Meretgeldiyew Muhammedow Nazarow
    Nurberdiyew Orazgeldiyew Pirjanow Rahymow Resulow Sahatow Seyitgulyyew Suleymanow Tagangulyyew Toylyyew
    Yagshyyew Yusupow Zakirow Agajanow Bekmyradow Gochmuradow Hydyrow Kurbanow Mollayew Ovezgeldiyew`,
});
/** Gulf names: the Arabian peninsula's given names, and its tribal and family names in the Al- form. */
const GULF_ARABIC = group("gulf-arabic", {
    masculine: `
    Mohammed Abdullah Abdulaziz Abdulrahman Khalid Fahad Faisal Sultan Saud Turki Nasser Hamad Saeed Rashid Mansour
    Hamdan Majid Salman Nawaf Talal Bandar Mishal Mutlaq Mubarak Saad Saleh Ahmed Ali Omar Yousef Ibrahim Hamed
    Jassim Khalifa Obaid Humaid Fawaz Nayef Bader Meshari Dhafer Hazza Suhail Ghanim Juma Khamis Saif Tariq Waleed
    Yasser Ziyad Anwar Adel Ayman Haitham Hussain Jaber Marzouq Muhanna Mutaib Nabil Qasim Raed Sami Sattam Shaheen
    Thamer Wael Zaid Azzam Ghazi Hassan Jamal Abdulmajeed Abdulmohsen Abdulkarim Abdullatif Abdulwahab`,
    feminine: `
    Fatima Maryam Noura Reem Maha Hind Latifa Aisha Mona Huda Amal Shaikha Sara Hessa Moza Alanood Dana Lulwa
    Jawaher Nouf Haya Munira Asma Rawan Shahad Ghada Hanan Khawla Manal Najla Nada Samira Wafa Zainab Hala Hanadi
    Johara Lamya Lina Mashael Nawal Ohood Rania Salwa Sameera Wadha Afra Alia Amira Bushra Dalal Hamda Hayat Kholoud
    Lamees Nadia Najwa Rasha Shamma Maysa Nahla Suad Tahani Wijdan`,
    neutral: `
    Nour Salam Iman Ihsan Diya Wisam Nidal Rida Sabah Kifah Rayan Alaa Karam Hilal Riyad Nizar Fida Tayseer Hanin
    Tamim Anis Rand Adham Layth Rakan Ghazal Feras Jood Ghufran Safa`,
    surname: `
    Al-Otaibi Al-Qahtani Al-Harbi Al-Dosari Al-Ghamdi Al-Zahrani Al-Shehri Al-Mutairi Al-Anazi Al-Shammari
    Al-Rashidi Al-Ajmi Al-Kaabi Al-Mansouri Al-Mazrouei Al-Suwaidi Al-Marri Al-Kuwari Al-Hajri Al-Busaidi Al-Balushi
    Al-Harthy Al-Hinai Al-Rawahi Al-Maawali Al-Jabri Al-Subaie Al-Dhaheri Al-Falasi Al-Ketbi Al-Shamsi Al-Hammadi
    Al-Muhairi Al-Romaithi Al-Qubaisi Al-Mheiri Al-Zaabi Al-Blooshi Al-Awadhi Al-Hashemi Al-Kindi Al-Amri Al-Asmari
    Al-Malki Al-Juhani Al-Sulami Al-Enezi Al-Azmi Al-Fadhli Al-Kandari Al-Mutawa Al-Hamad Al-Mulla Al-Rumaihi
    Al-Sulaiti Al-Muhannadi Al-Khater Al-Emadi Al-Kubaisi Al-Obaidli Al-Sayed Al-Khayarin Al-Muraikhi Al-Maliki
    Al-Yami Al-Rasheed Al-Fayez Al-Nuaimi`,
});
/** Maghreb names, in the French romanization Morocco, Algeria, Tunisia and Libya's public life writes them in. */
const MAGHREBI_LISTS = {
    masculine: `
    Mohamed Ahmed Youssef Karim Rachid Samir Nabil Kamel Hamza Amine Noureddine Abdelkader Mustapha Hassan Mourad
    Yassine Habib Abdelaziz Said Hamid Driss Fouad Khalid Mehdi Adil Aziz Brahim Hicham Jamal Lahcen Mokhtar Nasser
    Omar Othmane Redouane Saad Tarik Walid Zakaria Anis Bilal Chakib Djamel Farid Ferhat Hakim Idir Ilyes Kader Lamine
    Larbi Lotfi Mounir Nacer Nadir Rabah Riad Salah Sofiane Tahar Yacine Zine Abdelhak Abdelmajid Abderrahim Aissa
    Ayoub Bachir Boualem Chokri Hatem Hedi Mondher Slim Wassim Zied Tayeb`,
    feminine: `
    Fatima Amina Khadija Leila Yasmine Meriem Fatma Asma Amel Malika Amira Souad Chaima Samira Salma Nadia Karima
    Naima Rachida Saida Zineb Houda Hanane Imane Latifa Loubna Najat Nawal Rim Sanaa Siham Sonia Wafa Zohra Aicha
    Dalila Djamila Farida Fatiha Habiba Hafsa Hayat Ines Kenza Lamia Lina Lynda Malak Mouna Nora Ouafa Rania Safia
    Sabrina Sarra Sihem Wiam Yousra Zahra Hind Ikram Nesrine Ryma`,
    neutral: `
    Nour Sabah Salam Ihsane Iman Rida Diya Wissam Nidal Hilal Karam Anouar Ghali Rayane Ilham Wafae Chams Badr
    Amal Jihane Nahil Sami Hayet Ghizlane Imen Aymen Lilia Safouane Rim Soundous`,
    surname: `
    Benali Belhadj Bouzid Mansouri Trabelsi Gharbi Jebali Hammami Chebbi Saidi Ayari Sassi Karoui Labidi Touati Amri
    Berrada Haddad Missaoui Mrabet Belkacem Jaziri Meddeb Saadi Selmi Abid Ammar Ayadi Belaid Bennani Tazi Benjelloun
    Idrissi Fassi Chraibi Lahlou Sqalli Benmoussa Bensaid Benyahia Benzaoui Bouazza Boukhari Bouchareb Brahimi Cherif
    Djebbar Ghoul Hadjadj Haddouche Kaci Khelifi Lamari Meziane Mokrani Ouali Rahmani Slimani Taleb Yahiaoui Zerrouki
    Chaabane Dridi Guesmi Hamdi Jlassi Khelil Mahjoub Nasri Riahi Sfaxi Tlili Zouari Bakkali Amrani Ouardi Filali
    Hajji Kettani Lamrani Moussaoui Naciri Ouazzani Rifai Sebti Tahiri Ziani Obeidi Warfalli Zawi Tarhouni`,
};
const MAGHREBI = group("maghrebi", MAGHREBI_LISTS);
/** Mauritania's Moorish names: a given name, then "Ould" or "Mint" and the father's. */
const MAURITANIAN = group("mauritanian", MAGHREBI_LISTS, "mauritanian-patronymic");
/** Eritrea's Tigrinya names: a given name and the father's given name, no family name. */
const TIGRINYA = group("tigrinya", {
    masculine: `
      Tesfay Berhane Gebremichael Haile Kidane Tsegay Tekle Mebrahtu Tewolde Tekeste Hagos Gebreegziabher Berhe Kahsay
      Weldu Asmelash Mulugeta Hailemariam Fitsum Goitom Filmon Samuel Yonas Daniel Mussie Yosief Habtom Semere Tsegaye
      Aregawi Abraham Amanuel Ermias Ghebremeskel Isaac Kibrom Mehari Mikael Negasi Robel Senai Simon Teklay
      Tesfamariam Tesfalem Tsegai Woldemichael Yared Yohannes Zerai Abel Andom Awet Biniam Dawit Efrem Eyob Futsum
      Ghirmay Hailu Kiflom Luel Mehretab Merhawi Nahom Petros Sirak Solomon Tekie Temesghen Weldeab`,
    feminine: `
      Senait Mebrat Lemlem Azieb Rahel Hiwet Selam Ruta Freweini Tsega Saba Luwam Helen Mehret Yordanos Feven Nazret
      Winta Delina Eden Selamawit Abeba Adiam Almaz Aster Bisrat Elsa Eyerusalem Fana Fiori Genet Hanna Hidiat Kisanet
      Lidia Lula Mahlet Meaza Meron Miriam Nebiat Rigat Rodas Samrawit Segen Semhar Tsige Tsion Yodit Zewdi Zufan
      Arsema Bethlehem Danait Elen Hermon Kidisti Nigsti Nardos Rahwa Sara Tirhas`,
    neutral: `
      Selam Tsega Amen Hiwot Tesfa Berhan Kidan Mesgun Rezene Neguse Zemen Wintana Tsinat Haben Tsegereda Fikre
      Mesfin Nati Semret Tensae Sosna Timnit Eyuel Yemisrach Kokob Rimon Kibra Beraki Shewit Hagosa`,
}, "patronymic");
/** Chad's Arabic-speaking north, whose names its governments have mostly carried: a given name and the father's. */
const CHADIAN = group("chadian", {
    masculine: `
      Mahamat Idriss Abakar Moussa Ahmat Oumar Brahim Haroun Adoum Abdelkerim Saleh Youssouf Abderaman Hissein Ali
      Hassan Djimet Mahamoud Adam Abdallah Issa Hamid Djibrine Zakaria Souleymane Khalil Nour Hassane Allamine Annour
      Bichara Choua Daoud Faki Gali Hamdan Kedallah Mahadjir Makaila Nassour Ramadane Tahir Yaya Younous Zene Abba
      Acheikh Alhabo Allatchi Arabi Bakhit Barka Chaibo Dahab Djibril Moustapha Ousmane Rakhis Bourma Seid Sougui
      Tidjani Hamza Abdelaziz Mahadi Sileck`,
    feminine: `
      Achta Amina Fatimé Hadjé Halimé Kaltouma Khadidja Mariam Zara Zenaba Aché Djamila Hawa Ramatou Saadié Salma
      Soumaya Zakia Aicha Asma Haoua Hadjara Mariama Nafissa Safia Fatna Rakiya Hadiza Ammouna Assia Azza Bintou
      Dari Fanné Habiba Hapsita Hassaniya Hinda Kadidja Khamissa Leila Madina Mahadia Maimouna Nadjwa Oumou Rahma
      Rouwaida Saida Samira Souad Tamara Yasmina Zeinaba Zouhoura Karima Haliima Adjia Amani Hadja`,
    neutral: `
      Nour Salam Rahama Barka Imane Anour Baraka Sabah Diya Bakhita Alamine Nasra Kheir Rida Amal Mahbouba Nima Nasr
      Hilal Safi Wafi Djouma Sakina Ramla Ihsan Fida Karam Maka Bahr Ghazal`,
}, "patronymic");
/** The Comoros: Swahili-Arabic given names, the father's given name serving as the second. */
const COMORIAN = group("comorian", {
    masculine: `
      Ahmed Said Mohamed Ali Abdallah Houmed Soilihi Fahmi Moustoifa Djaffar Ibrahim Hamada Mbae Anissi Chamsidine
      Youssouf Oumouri Bacar Chaharane Nourdine Mouigni Hamidou Kamardine Saandi Toihir Madi Mhoudine Abdou Salim Msa
      Moussa Ahamada Boina Chabane Daoud Dhoihir Elarif Fakridine Hachim Halidi Hassani Idjihadi Ismael Kassim Mahamoud
      Massoundi Mohadji Mouhidine Nassor Omar Oussene Rachidi Sidi Soulaimana Tadjidine Youssoufa Zaidou Allaoui
      Attoumane Barwane Djamal Houssein Ibouroi Mbaraka Nassim Soudjay`,
    feminine: `
      Fatima Mariama Halima Sitti Moinaecha Echata Rahamatou Faouzia Nadjima Hadidja Anlia Zainaba Mouna Taslima
      Sittou Hayati Amina Chamsia Echati Hadjira Hamida Hassanati Karima Loubna Mariamou Nadia Naima Raissa Saandia
      Sakina Salama Samira Sania Sitina Touhfat Wardat Zahara Fatouma Hadia Hasnati Mounira Nouria Rahma Saida Siti
      Anfiata Baraka Djamila Faida Hamssoiti Irchadi Kamaria Latoifa Mahoudhoir Moinourou Nafissa Rahima Sarata
      Soifiat Zalhata`,
    neutral: `
      Nour Salama Baraka Rahma Amani Faraji Imani Nasra Sifa Zawadi Hadji Sabiha Ikbal Nadjat Anfane Ihsane Fadhila
      Amal Rida Wafa Kheir Djouma Hilal Safi Tamani Mwanaisha Tabibou Kamal Iman Hamza`,
}, "patronymic");
/** The Maldives: Arabic given names in Dhivehi spelling, followed by the father's. */
const MALDIVIAN = group("maldivian", {
    masculine: `
      Mohamed Ahmed Ibrahim Ali Hussain Hassan Abdulla Ismail Moosa Yoosuf Adam Shareef Rasheed Shahid Riyaz Zahir
      Fayaz Shiham Imran Hamid Latheef Naseem Saleem Jaleel Majeed Hameed Rafeeq Zameer Nazim Amir Zaid Rizwan Ilyas
      Shinaz Mauroof Hisaan Athif Azim Mifzal Nishan Shafeeq Ahusan Aslam Faisal Haleem Anwar Arif Asim Fareed Ghassan
      Hilmy Ihusan Jameel Khaleel Mahir Mujthaba Niyaz Qasim Rauf Saeed Shakir Siraj Thoriq Umar Wajeeh Zubair`,
    feminine: `
      Aishath Aminath Fathimath Mariyam Hawwa Khadheeja Shareefa Zeenath Asiya Hafsa Raheema Saeeda Zulaikha Haleema
      Nasreena Shifa Shazna Shaheema Mausooma Azeema Aneesa Sofoora Nashida Fazeena Shahula Rasheeda Naseema Zahiya
      Ruqiyya Hana Leena Lubna Nadiya Muna Sana Hudha Thasneem Afiya Amira Dhiyana Fariha Hisana Jameela Laila Mazeena
      Nuha Raaidha Rifa Salma Samaa Shaina Shamra Suzana Yumna Zahira Shamha Nazeera Aneela Fazna Mishka`,
    neutral: `
      Nooru Iman Ihsan Safa Nazeeh Rida Wafa Aman Shams Salam Diya Ihusan Hilmy Nafa Raaif Ahsan Amaal Faiz Shifaz
      Nazeef Afrah Mishal Riyasa Fahud Samah Nasih Liyan Shaan Hanan Aroosh`,
}, "patronymic");
/**
 * South Africa's Nguni names, Zulu and Xhosa: a given name, often English or
 * Christian beside an isiZulu one, and a clan surname.
 */
const NGUNI = group("nguni", {
    masculine: `
    Sipho Thabo Themba Bongani Mandla Sibusiso Lwazi Siyabonga Nkosinathi Sifiso Thulani Musa Vusi Zola Lungile
    Lwandile Andile Luthando Mzwandile Xolani Bheki Mxolisi Sizwe Khaya Lindani Mlungisi Phumlani Siyanda Sabelo
    Mthunzi Sanele Bafana Nhlanhla Lungelo Mondli Njabulo Sandile Thando Zweli Mfundo Sakhile Senzo Mpho Nkululeko
    Sbu Vuyani Zukisa Xolisa Lonwabo Unathi Yonela Anele Zamokuhle Simphiwe Siphamandla Ntokozo Wandile Mthokozisi
    Mzukisi Sihle Mcebisi Lindokuhle Bonginkosi`,
    feminine: `
    Nomvula Thandeka Nokuthula Zanele Lindiwe Nomsa Thandi Busisiwe Zodwa Nosipho Ntombi Nonhlanhla Sibongile
    Precious Nandi Zinhle Khanyisile Nompumelelo Thembeka Noluthando Siphokazi Zintle Nokwanda Asanda Yonela
    Nosiviwe Nobuhle Ayanda Zandile Lerato Phindile Sindisiwe Thembi Nondumiso Bongiwe Nomthandazo Nolwazi
    Zikhona Anathi Lulama Ncumisa Nobantu Nomalanga Ziyanda Sinethemba Nomfundo Mbali Amahle Hlengiwe Snenhlanhla
    Thobeka Nqobile Zinzi Nosizwe Andiswa Buhle Minenhle Zenande Lwazikazi Sinovuyo Mandisa`,
    neutral: `
    Ayanda Lwazi Andile Siyabonga Sibusiso Thando Lungile Zola Buhle Sihle Anele Unathi Asanda Yonela Nkosi Bonga
    Sinethemba Sandile Lindokuhle Mpho Zizi Sanele Nhlaka Minenhle Lulama Anathi Luyolo Philani Simphiwe Zamo`,
    surname: `
    Dlamini Ndlovu Nkosi Mkhize Zungu Ngcobo Mthembu Khumalo Mahlangu Shabalala Ntuli Gumede Hlongwane Zwane
    Sithole Nxumalo Mbatha Gcabashe Mabaso Majola Mkhwanazi Mncube Mnguni Mthimkhulu Myeni Ngubane Shezi Xulu Ndaba
    Biyela Hadebe Khanyile Luthuli Magubane Masondo Mdlalose Mkhabela Msimang Ngema Nhlapo Qwabe Sibiya Vilakazi
    Zondi Mabandla Dyantyi Mlambo Gqirana Mxenge Sotyu Gqiba Ncube Mgoqi Qoboza Madikizela Tshabalala Ngcukana
    Mbeje Ntshangase Cele Nzuza Ngidi Radebe Msomi Mtshali Zulu Mazibuko Mthethwa Ngwenya`,
});
/** Afrikaans names: given names of the generation in public life, and the Cape Dutch, Huguenot and German family names. */
const AFRIKAANS = group("afrikaans", {
    masculine: `
    Pieter Johan Jan Hendrik Willem Gerhard Francois Jacques Andries Stefan Riaan Deon Danie Kobus Wynand Marius
    Christo Louis Gert Schalk Theuns Herman Nico Pierre Ruan Charl Jaco Werner Dewald Johann Cornelius Hennie Jaap
    Petrus Frikkie Gideon Tertius Barend Casper Dirk Ernst Frans Hannes Izak Jurie Lourens Marthinus Nardus Ockert
    Paul Rudolph Sarel Tjaart Wessel Adriaan Abraham Carel Eben Fanie Gysbert Heinrich Johannes Koos Leon Manie`,
    feminine: `
    Annelie Marietjie Elmarie Susanna Anri Carina Liezl Marelize Magda Rina Hester Elsabe Chantelle Lize Mariska
    Annemarie Juanita Karin Yolandi Riana Estelle Ilze Madeleine Elize Nadia Adri Alida Anel Anneke Bettie Charlize
    Corlia Deidre Elna Elsie Esmé Hanlie Hettie Ilana Ina Jolene Karlien Lientjie Lizelle Marlize Marthie Mia Mienkie
    Petro Renske Ronel Sanet Sonja Tanya Tersia Wilma Zelda Nelmarie Lindie Mariaan Anchen`,
    neutral: `
    Chris Jo Jacky Dani Robin Kim Frankie Lou Tony Sam Charlie Nicky Terry Jamie Lee Ash Jess Ruan Jean Nel Toni
    Sasha Mickey Bobbie Andy Jody Kerry Alex Jaydee Kelly`,
    surname: `
    Van der Merwe, Pretorius, Nel, Smit, Du Plessis, Van Wyk, Venter, Coetzee, Fourie, Steyn, Jacobs, Kruger, Le Roux,
    Du Toit, Swanepoel, Joubert, Olivier, Potgieter, Viljoen, Marais, Engelbrecht, Oosthuizen, Visser, Meyer,
    Bezuidenhout, Erasmus, Snyman, Lombard, Janse van Rensburg, De Villiers, Cronje, Labuschagne, Mulder, Van Zyl,
    Myburgh, Badenhorst, Bekker, Bester, Bosman, Brink, Burger, Claassen, Conradie, De Beer, De Bruyn, De Jager,
    De Wet, Du Preez, Ferreira, Grobler, Hattingh, Horn, Human, Jansen, Jordaan, Kotze, Lategan, Louw, Malherbe,
    Minnaar, Naude, Odendaal, Roux, Scholtz, Terblanche, Theron, Uys, Van Niekerk, Van Heerden, Van Tonder,
    Vermeulen, Wessels`,
});
/** Malay names: a given name, then "bin" or "binti" and the father's name. No family name. */
const MALAY = group("malay", {
    masculine: `
      Ahmad Muhammad Mohd Aziz Azman Hafiz Hakim Hisham Ismail Kamal Khairul Mazlan Nazri Rahman Razali Rosli Shahrul
      Zainal Zulkifli Faizal Fauzi Firdaus Hamzah Harun Hasnul Idris Iskandar Jamal Johari Kamarul Khalid Marzuki
      Mustafa Nasir Rashid Ridzuan Rizal Roslan Sabri Safuan Saiful Salleh Samsul Shafie Sulaiman Taufik Yusof Zaki
      Zamri Zulkarnain Amirul Anuar Asri Azlan Azhar Baharuddin Fadzil Fikri Haziq Helmi Irfan Jaafar Kassim Latif
      Lokman Mokhtar Nizam Osman Rahim Syafiq Tajuddin Yahya Hussein Abdullah Ibrahim Hashim Omar`,
    feminine: `
      Siti Nurul Aminah Azizah Faridah Hafizah Halimah Hasnah Khadijah Latifah Maimunah Mariam Norazlina Norhayati
      Normah Rohani Rosnah Salmah Suhaila Zaleha Zainab Zuraidah Aishah Aliya Amira Anis Asma Atikah Balqis Farah
      Fatimah Hanis Husna Intan Izzati Jamilah Liyana Mazlina Mastura Nabila Nadia Najwa Nazira Nora Rahimah Raihan
      Rozita Sabariah Safiah Salina Shahida Sofia Syafiqah Syazwani Wahida Yasmin Zahrah Zarina Zubaidah Ruhani Hanim
      Azlina Fauziah Maznah Norlia`,
    neutral: `
      Nur Noor Iman Ihsan Ikhlas Amal Hidayah Rahmat Sabar Taqwa Syukur Wafi Nurin Ain Aqil Izzat Daniel Adam Aiman
      Ariff Danish Emir Hanan Irdina Luqman Nadim Rayyan Sufi Tasnim Zahin`,
}, "malay-patronymic");
/**
 * Burmese names: one to four personal names and no family name at all. A
 * person is drawn two of them, the first by what they present as and the
 * second from the names both sexes carry, which is how a Burmese name reads.
 * Each first name is one syllable of its own, so no two colleagues open their
 * names alike.
 */
const BURMESE = NameGroup.parse({
    id: "burmese",
    given: {
        masculine: distinct("burmese", "masculine", words(`
      Aung Min Zaw Kyaw Htun Tun Thein Win Myint Soe Naing Hla Thant Htay Maung Nyunt Lwin Thu Ye Htut Hein Sein Tin
      Than Shwe Myo Pyae Phyo Yan Han Linn Nay Thura Zeya Kaung Khant Htet Wunna Thiha Sithu Tayza Nyi Paing Chit Bo
      Thet Myat Nanda Ko Zin Pyi Kyi Hlaing Moe Nyein Yarzar Arkar Htoo Swan Zayar Okkar Pone Lin Wai`)),
        feminine: distinct("burmese", "feminine", words(`
      Su Khin Thida May Aye Nwe Hnin Ei Phyu Thandar Nilar Mya Yin Cho Sandar Thiri Yadanar Ngwe Khaing Htwe Sabai
      Wint Yu Lay Marlar Zar Chaw Hsu Mon Kay Thazin Nan Thin Nandar Thuzar Yamin Yati Moh Poe Theint Nway Khine
      Ohnmar Pan Phoo Zun Wutyi Eaint Hmwe Mi Kalyar Thinzar Sanda Tharaphi Wah Mar Shwe Hla Moe Zin Pyae Myat`)),
        neutral: words(`
      Myat Shwe Wai Win Thu Hla Nyein Phyo Moe Thet Kyi Aye Myint Zin Htet Pyae Soe San Oo Lin Thiha Nay Hsu Tint
      Yamin Yati Nandar Thuzar Mya Ngwe`),
    },
    surname: words(`
    Oo Win Myint Aung Htun Kyaw Lwin Naing Soe Htet Zaw Thein Hlaing Thant Tun Nyein Thu Phyo Khaing Nwe Aye Mon
    Wai Zin Moe Thet Myat Hein Min Khant Linn Paing Sein Htay Shwe Hla Nyunt Maung Kyi Than Tint San Lin Yee Mar
    Thwe Swe Myo Pyae Nandar Thandar Nilar Sandar Marlar Khine Ohn Pe Chit Tin Han Ye`),
});
/** Nigeria's Yoruba names: given names and family names of the southwest, Christian and Muslim. */
const YORUBA = group("yoruba", {
    masculine: `
    Adebayo Adekunle Adeyemi Ayodele Babajide Babatunde Damilare Folarin Gbenga Kayode Olumide Oluwaseun Oluwatobi
    Ayotunde Tunde Femi Kunle Segun Wale Yemi Bayo Dayo Deji Jide Bode Dapo Lanre Lekan Niyi Rotimi Sola Tayo
    Abiodun Adewale Adeniyi Akinwale Akinola Bamidele Biodun Damola Folorunsho Gbolahan Kolawole Ladipo Olalekan
    Olaniyan Olatunji Olawale Oluwafemi Oluwole Omotayo Oyewole Tijani Tunji Afolabi Ademola Bolaji Fisayo Jimoh
    Rasheed Ganiyu Kazeem Mutiu Wasiu Akeem`,
    feminine: `
    Adebola Adenike Aduke Afolake Ayoola Bisola Bolanle Bunmi Folake Folasade Funke Funmilayo Iyabo Kemi Mojisola
    Morenike Moyosore Olabisi Olajumoke Oluwabunmi Oluwakemi Omolara Omotola Omowunmi Remi Ronke Sade Titilayo Titi
    Tolani Tolulope Yetunde Abimbola Adebimpe Adejoke Ajoke Arike Ayobami Bimpe Bukola Dupe Ebunoluwa Ibironke
    Jumoke Kikelomo Modupe Motunrayo Nike Omobolanle Opeyemi Simisola Temidayo Tinuke Yewande Yeside Folashade
    Oyinkansola Moradeke Olufunke Adunni Omolola Toluwalope`,
    neutral: `
    Tope Temitope Yinka Ibukun Kehinde Taiwo Idowu Damilola Seyi Tolu Ayo Dami Adeola Ife Iyanu Oluwaseyi
    Toluwani Boluwatife Oreoluwa Ayomide Enitan Ifedayo Tobi Ayanfe Simi Oluwadamilare Olamide Fiyin Morayo Ireti`,
    surname: `
    Adeyemi Adebayo Ogunleye Ogunbanjo Adekunle Adeoye Balogun Bankole Adewale Oyelaran Ojo Ogundipe Afolabi Sowande
    Owolabi Adesanya Fagbenle Olawale Akinwumi Ayodele Babalola Oyewole Adebiyi Oladipo Ogunbiyi Akande Oyebanji
    Alabi Olaniyan Ajayi Okunola Adegoke Adeniran Odunsi Salako Oduya Ogunlesi Oyedele Olatunji Oyeyemi Adeniyi
    Olabode Akinyemi Ogunsanya Ayinde Olowu Adeleye Ajibola Akinlade Aluko Bamgbose Bello Dada Fadipe Faleye Ige
    Lawal Ogunwale Oke Olayinka Omotoso Onabanjo Oni Oyekunle Sanni Taiwo Adelabu Akinbode Awoyemi Fatoki`,
});
/** Nigeria's Igbo names: given names and family names of the southeast, most of them sentences about God. */
const IGBO = group("igbo", {
    masculine: `
    Chidi Chidozie Chinedu Chinonso Chukwuemeka Chukwudi Ebuka Emeka Ifeanyi Ikechukwu Nnamdi Obinna Okechukwu
    Uchenna Chibuzor Chijioke Chimaobi Chinemerem Chukwuma Ekene Ifeanyichukwu Kelechi Kenechukwu Obiora Onyekachi
    Somtochukwu Tochukwu Udochukwu Uzoma Arinze Azubuike Chiedu Chigozie Ejike Ikenna Izuchukwu Kalu Kanayo
    Nnaemeka Ogbonna Onyebuchi Tobenna Ugochukwu Uzochukwu Dozie Amaechi Chibueze Chimezie Echezona Mmaduabuchi
    Nnanna Osita Obumneme Ekenedilichukwu Nwabueze Chukwunonso Ebere Okwudili Ugonna Chinecherem Munachimso`,
    feminine: `
    Ngozi Chioma Adaeze Adaora Amaka Chiamaka Chinwe Nkechi Ifeoma Obiageli Uchechi Ujunwa Chinyere Chidinma Nneka
    Ebele Ogechi Onyinye Uzoamaka Adanna Akunna Amarachi Chinelo Chinenye Ezinne Ifeyinwa Ijeoma Ngozika Nkiruka
    Nwakaego Obioma Oluchi Ugochi Uju Chizoba Adaobi Amara Chibugo Chidimma Chinasa Chinyelu Ifunanya Kamsiyochi
    Nnenna Nwanneka Ozioma Ukamaka Uloma Zikora Nkoli Nwamaka Ihuoma Chikodili Adamma Anulika Ebubechi Chimamanda
    Kosisochi Somadina Olanna`,
    neutral: `
    Chika Chisom Onyeka Nkem Chinaza Ebube Kamsi Munachi Chiedozie Ozioma Ike Chike Chime Amaechi Ogechi Adaugo
    Nonso Kosisochukwu Ndidi Anayo Nkemdirim Ejike Ngozika Amarachukwu Somtochukwu Ifunanya Chimobi Uche
    Chiagozie Obiageli`,
    surname: `
    Okafor Okonkwo Nwosu Eze Okoro Chukwu Nwachukwu Onyeka Ibe Anyanwu Obi Nnaji Iwu Okeke Uche Nweke Madu Duru
    Obiora Onuoha Nwankwo Ugwu Agu Okoye Ezeh Nnadi Ogbonna Nwafor Ezeani Ikeji Umeh Mbah Anozie Ezenwa Ogbu Onwuka
    Nwaeze Igwe Orji Ukaegbu Nwoye Ibekwe Chukwuma Anosike Uzor Ekeh Obasi Nzeribe Onyeama Okwu Nwokolo Emenike
    Chima Iheanacho Nwogu Oguejiofor Ozoemena Onwuachi Ezeugwu Nwokoye Aneke Ejiofor Ikechi Nwadike Ogbuagu Okpara`,
});
/** Northern Nigeria's Hausa and Fulani names, Muslim, the second name often the father's given name. */
const HAUSA = group("hausa", {
    masculine: `
    Ibrahim Abubakar Musa Aliyu Usman Sani Bello Yusuf Umar Suleiman Abdullahi Ahmad Garba Haruna Idris Isa Kabiru
    Lawal Mustapha Nasiru Rabiu Salisu Shehu Tanko Yakubu Yahaya Zakari Adamu Aminu Auwalu Bashir Dauda Faruk Gambo
    Habibu Hamza Hassan Ismaila Jibrin Mahmud Mansur Mohammed Mukhtar Nuhu Salihu Sadiq Tijjani Uba Zubairu Ahmadu
    Bala Buba Danjuma Dikko Hadi Inuwa Jafaru Kawu Sabo Shamsudeen Tukur Yaro Abdulkadir Abdulrahman Nura`,
    feminine: `
    Aisha Amina Fatima Hadiza Halima Hauwa Maryam Zainab Hafsat Asmau Binta Rabi Safiya Salamatu Zulaihat Aminat
    Balaraba Bilkisu Hajara Hansatu Jamila Khadija Ladi Mairo Mariya Nafisa Rahama Ramatu Saadatu Sadiya Salma Umma
    Yagana Zahra Zuwaira Asabe Aishatu Fadimatu Habiba Hassana Husaina Inna Kulu Laraba Maimuna Rakiya Rukayya
    Talatu Ummi Yalwa Zulai Hindatu Fiddausi Fatsuma Murjanatu Rashida Sumayya Nana Hadiyya Amira Hussaina Zainabu`,
    neutral: `
    Nasara Albarka Alheri Nuru Baraka Rahama Salama Sa'a Tsoho Kyauta Amana Barka Nasiru Nuraddeen Hadiza Sadiya
    Wakili Galadima Iman Nur Haske Farin Gaskiya Zaman Taimako Albishir Arziki Dauda Sallah Juma`,
    surname: `
    Bello Abubakar Mohammed Musa Ibrahim Usman Garba Sani Aliyu Yusuf Lawal Suleiman Haruna Adamu Umar Danjuma Dikko
    Gwarzo Abdullahi Ahmad Aminu Bala Baba Chiroma Danladi Dantsoho Gambo Gidado Hamidu Idris Inuwa Jibrin Kabir
    Kaita Kurfi Lamido Liman Madaki Maigari Maikano Mairiga Mani Ringim Shehu Shuaibu Tafida Tukur Turaki Yakasai
    Yero Zubairu Galadima Waziri Dambatta Fagge Gumel Jega Kazaure Minjibir Rogo Dankano Bichi Kankia Zango`,
});
// --- The banks, and the nations that draw from several traditions ------------
export const REGIONAL_NAME_CULTURES = [
    "russian",
    "ukrainian",
    "kazakh",
    "uzbek",
    "tajik",
    "kyrgyz",
    "turkmen",
    "gulf-arabic",
    "maghrebi",
    "mauritanian",
    "tigrinya",
    "chadian",
    "comorian",
    "maldivian",
    "malay",
    "burmese",
    "south-african",
    "malaysian",
    "nigerian",
];
/** A group drawn at a share of a nation's people. */
const at = (weight, from) => ({ ...from, weight });
/**
 * The traditions a nation's people are named from, by rounded share of its
 * population: South Africa's Nguni, Sotho-Tswana, Afrikaans and English
 * speakers; Malaysia's Malays and Chinese; Nigeria's Hausa-Fulani north,
 * Yoruba southwest and Igbo southeast.
 */
export function composites(parts) {
    return {
        "south-african": NameBank.parse({
            groups: [at(0.55, NGUNI), at(0.25, { ...parts.sothoTswana, id: "sotho-tswana" }), at(0.12, AFRIKAANS), at(0.08, { ...parts.anglo, id: "anglo" })],
        }),
        malaysian: NameBank.parse({ groups: [at(0.75, MALAY), at(0.25, { ...parts.han, id: "han", form: "family-given" })] }),
        nigerian: NameBank.parse({ groups: [at(0.4, HAUSA), at(0.33, YORUBA), at(0.27, IGBO)] }),
    };
}
export const REGIONAL_NAME_BANKS = {
    russian: NameBank.parse({ groups: [RUSSIAN] }),
    ukrainian: NameBank.parse({ groups: [UKRAINIAN] }),
    kazakh: NameBank.parse({ groups: [KAZAKH] }),
    uzbek: NameBank.parse({ groups: [UZBEK] }),
    tajik: NameBank.parse({ groups: [TAJIK] }),
    kyrgyz: NameBank.parse({ groups: [KYRGYZ] }),
    turkmen: NameBank.parse({ groups: [TURKMEN] }),
    "gulf-arabic": NameBank.parse({ groups: [GULF_ARABIC] }),
    maghrebi: NameBank.parse({ groups: [MAGHREBI] }),
    mauritanian: NameBank.parse({ groups: [MAURITANIAN] }),
    tigrinya: NameBank.parse({ groups: [TIGRINYA] }),
    chadian: NameBank.parse({ groups: [CHADIAN] }),
    comorian: NameBank.parse({ groups: [COMORIAN] }),
    maldivian: NameBank.parse({ groups: [MALDIVIAN] }),
    malay: NameBank.parse({ groups: [MALAY] }),
    burmese: NameBank.parse({ groups: [BURMESE] }),
};
/**
 * Which tradition a multi-tradition nation's lead chair is named from: the
 * one its holder came from on the leader table's date, since a fictional
 * leader stands in for that government and not for the country's average.
 */
export const LEAD_TRADITION = { ZAF: NGUNI, MYS: MALAY, NGA: YORUBA };
