import { NAME_BANKS, type NameCulture } from "./name-banks.js";
import { VENDORED_NAME_BANKS, type VendoredNameCulture } from "./name-banks.vendored.js";
import { LEAD_TRADITION, REGIONAL_NAME_BANKS, composites, type RegionalNameCulture } from "./name-banks-regional.js";
import { NameBank, NameGroup, type NameForm } from "../schemas/people-pool.js";
import type { PortraitHeritage } from "../schemas/portrait.js";

/**
 * The American bench, named the way American officials are named.
 *
 * The United States used to draw every name from the `anglo` bank it shares
 * with Britain, Canada, Australia and the Anglophone Caribbean, so a House
 * Democratic caucus that is a quarter Black and a sixth Hispanic was staffed by
 * Smiths and Coopers. These six groups are counted from public records rather
 * than authored, and a person draws from the one their own heritage picks, so a
 * name and a face agree.
 *
 * Sources, each opened 2026-09-23:
 *
 * - Surnames: U.S. Census Bureau, "Frequently Occurring Surnames from the 2010
 *   Census" (Names_2010Census.csv in
 *   https://www2.census.gov/topics/genealogy/2010surnames/names.zip), public
 *   domain. Each group is the surnames ranked by count x the group's percentage
 *   (white at >= 50% white and < 20% Hispanic and Asian; Black at >= 25% Black;
 *   Hispanic at >= 60% Hispanic; the three Asian groups at >= 50-70% Asian and
 *   Pacific Islander, split by tradition by hand). Forms the file strips of
 *   spacing (DELACRUZ, VANBUREN) are left out, and so are the surnames of every
 *   president and vice president since 1961.
 * - Given-name sex: Social Security Administration national baby names,
 *   yob1945-yob1995 (https://www.ssa.gov/oact/babynames/names.zip, public
 *   domain; retrieved through the Internet Archive's copy because ssa.gov
 *   refuses scripted downloads). Masculine is >= 90% male, feminine <= 10%,
 *   neutral 25-75%.
 * - Given-name ethnicity: Tzioumis, K. (2018), "Demographic aspects of first
 *   names", Scientific Data 5:180025, Harvard Dataverse doi:10.7910/DVN/TYJKEZ,
 *   CC0 1.0. Names ranked by SSA count x the group's percentage; the Asian
 *   groups lead with heritage names (Priya, Minh, Wei) and fill with the
 *   American names Asian Americans most often carry.
 */
export type UsNameGroupId = "white" | "black" | "hispanic" | "east-asian" | "south-asian" | "southeast-asian";

const words = (text: string): string[] => text.trim().split(/\s+/);

const US_NAME_SOURCE: Readonly<
  Record<UsNameGroupId, { masculine: string; feminine: string; neutral: string; surname: string }>
> = {
  "white": {
    masculine: `
      Michael James John Robert David William Christopher Richard Thomas Joseph Daniel Mark Steven Matthew Charles
      Brian Timothy Kevin Jeffrey Paul Jason Kenneth Anthony Joshua Andrew Gary Scott Ronald Stephen Eric Gregory Ryan
      Larry Edward Justin Jonathan Patrick Nicholas George Dennis Douglas Brandon Adam Jerry Peter Keith Jeremy Aaron
      Kyle Frank Benjamin Jacob Raymond Sean Bruce Randy Roger Craig Tyler Todd Zachary Bryan Nathan Bradley Samuel
      Alan Travis Lawrence Carl Gerald Chad Wayne Alexander Russell Phillip Jeffery Philip Jesse Dale Danny Walter
      Rodney Cody Ricky Randall Jack Billy Dustin Steve Arthur Derek Curtis Roy Harold Troy Vincent Bobby Joel Glenn
      Barry Allen Martin Ralph Shane Corey Jon Johnny Henry Jimmy Louis Mike Jay Albert Brett Christian Austin Tony
      Frederick Jared Brent Ronnie Stanley Eugene Howard Marc Leonard Marcus Darrell Dean Wesley Mitchell Cory Harry
      Jeff Erik Francis Fred Ernest Ian Tommy Theodore Marvin Nathaniel Norman Dylan Evan Cameron Jerome Alex Clifford
      Earl Lance Brad Seth Kurt Darren Don Trevor Jim Rick Ray Greg Melvin Duane Glen Tim Warren Karl Blake Neil Edwin
      Alfred Bill Bernard Eddie Luke Tom Derrick Gordon Calvin Dan Kirk Clayton Jeremiah Clarence Clinton Darryl Caleb
      Lonnie Shaun Garrett Herbert Gene Kent Lucas Lewis Ross Lloyd Leroy Terrence Leon Daryl Rickey Andre Spencer
      Dwayne Stuart Guy Vernon Grant Allan Ethan Franklin Colin Geoffrey Maurice Dwight Perry Terrance Kristopher
      Jonathon Alvin Wade Donnie Floyd Johnathan Mathew Drew Marshall Ted Dominic Brendan Byron Clyde Leo Lester Garry
      Neal Gilbert Chase`,
    feminine: `
      Mary Jennifer Linda Susan Patricia Lisa Karen Elizabeth Jessica Barbara Kimberly Deborah Michelle Melissa
      Amanda Donna Nancy Sandra Sarah Amy Cynthia Stephanie Ashley Rebecca Laura Kathleen Sharon Pamela Debra Carol
      Angela Heather Christine Brenda Julie Nicole Diane Cheryl Margaret Christina Janet Katherine Rachel Lori Denise
      Emily Catherine Carolyn Teresa Tammy Megan Andrea Kathy Lauren Brittany Amber Kathryn Samantha Danielle Dawn
      Janice Judith Judy Theresa Erin Tina Ann Tiffany Sara Crystal Jacqueline Diana Paula Wendy Joyce Victoria Cindy
      Michele Anna Betty Shirley Bonnie Connie Sherry Jill Courtney Beverly April Rhonda Kristen Jane Sheila Suzanne
      Joan Valerie Anne Holly Peggy Kristin Debbie Virginia Marilyn Laurie Allison Dorothy Carrie Melanie Jean Erica
      Gail Cathy Renee Kayla Tara Martha Ruth Stacey Monica Beth Julia Vicki Ellen Terri Colleen Natalie Katie Darlene
      Wanda Gina Joanne Marie Helen Gloria Frances Elaine Heidi Rose Melinda Lindsey Alicia Rita Carla Phyllis Maureen
      Tamara Alice Chelsea Kristina Anita Vanessa Lindsay Sally Regina Charlotte Annette Tonya Vickie Deanna Hannah
      Alyssa Cassandra Leah Eileen Kelsey Alexandra Brandy Jeanne Christy Tanya Marcia Brooke Charlene Roberta Marsha
      Penny Sue Tracey Joann Brandi Molly Alison Misty Joy Shelly Whitney Sherri Toni Lorraine Evelyn Becky Lois
      Kristine Doris Jodi Audrey Constance Caroline Dianne Jeanette Kristi Sheryl Candace Yvonne Kara Loretta Shelley
      Katrina Erika Caitlin Kelli Meghan Brianna Jenna Sylvia Glenda Sabrina Kristy Rosemary Bethany Krista Bridget
      Lynda Brittney Melody Kendra Joanna Sheri Marlene Louise Irene Rachael Candice Robyn Kari Kay Claudia Natasha
      Abigail Meredith Jacquelyn`,
    neutral: `
      Taylor Casey Jackie Kerry Jody Jessie Marion Devon Dominique Johnnie Kendall Pat Frankie Robbie Kris Carey
      Aubrey Noel Blair Tommie Ashton Dusty Kristian Elisha Chandler Paris Brook Ali Stevie Skylar Shea Jamey Dorian
      Tory Regan Darian Britt Andra Hollis Marlo Shay Shanon Peyton Layne Jacque Darby Nicola Michal Lavern Reagan`,
    surname: `
      Smith Johnson Miller Brown Jones Davis Anderson Wilson Martin Taylor Moore Thompson White Clark Thomas Baker
      Nelson King Allen Young Harris Adams Lewis Walker Wright Hall Roberts Campbell Hill Phillips Scott Murphy Cook
      Green Evans Collins Peterson Morris Mitchell Parker Rogers Stewart Turner Wood Morgan Cox Kelly Edwards Bailey
      Reed Ward Myers Sullivan Cooper Bennett Hughes Long Fisher Price Russell Howard Gray Watson Reynolds Foster Ross
      Olson Richardson Brooks Perry Stevens Powell Snyder West Cole Wagner Meyer Hamilton Barnes Graham Sanders
      Schmidt Murray McDonald Patterson Gibson Wallace Butler Bell Hayes Fox Burns Ellis Stone Ryan Wells Henderson
      Hansen James Jenkins Jordan Webb Griffin Rose Harrison Hoffman Simmons Marshall Weaver Johnston Owens Nichols
      Alexander Kelley Mills Palmer Tucker Hunt Larson Rice Shaw Simpson Black Carlson Peters Dunn Arnold Robertson
      Crawford Bryant Pierce Carpenter Porter Carroll O'Brien Elliott Freeman Hart Mason Ferguson Jensen Gardner
      Stephens Hicks Warren Burke Henry Gordon Lane Woods Duncan Weber Richards Hanson Chapman Wheeler Ray Schultz
      Cunningham Walsh Knight Hunter Bishop Armstrong Riley Spencer Boyd Lynch Schneider Andrews Morrison Bradley
      Berry Perkins Welch Hudson Keller Gilbert Lawrence Howell Holmes Williamson Jacobs Lawson Davidson Carr Dean Day
      Dixon Schwartz George Greene Hawkins Fowler Bowman Beck Newman Harper Brewer Becker Matthews Powers Willis
      Barrett Austin Fuller Daniels Curtis Cohen Watkins Grant Holland Montgomery Harvey Lambert Zimmerman Erickson
      Klein Garrett McCarthy Stanley Wolfe Barker Lucas Burton Oliver Little Walters McCoy Leonard Pearson Barnett
      Craig O'Connor Bates Gregory Norris Hale Hopkins Christensen Warner Swanson Holt Steele Robbins Fischer Rhodes
      McDaniel Lowe Mann Benson Higgins Reid Shelton Quinn Doyle Sutton Gallagher Sharp McLaughlin Griffith Wolf
      Franklin Fitzgerald Fleming Schroeder Bowen Potter Adkins Caldwell Brady Mullins Jennings Reeves Lyons Gross
      Hail Wade Vaughn Chambers Page Baldwin Fields Blair Bauer Sims Watts Parks Mueller Parsons Ramsey Kramer
      Fletcher Hartman Horton Barber Douglas Chandler Graves Cross Sherman Flynn Barton Todd Casey Harmon Terry
      McKinney Cummings Goodman Neal Frank Dawson Thornton McGuire Owen Hess Newton Norton Goodwin Shaffer Burgess
      Olsen McCormick Manning Rowe Roth Yoder Bowers Osborne Harrington French Byrd Petersen Weiss Hammond Ball Wise
      Farmer Moss Sparks Rodgers Webster Garner Decker Hoover Larsen Blake Haynes Paul Simon Miles Frazier Strickland
      Buchanan Lamb Hodges Marsh Dennis Meyers Yates Brock Conner Cochran Daniel Hogan Lang Hubbard Waters Maxwell
      Cannon Hardy Gill Reese Drake Patton Short Pratt Malone Foley Stevenson Shepherd Sweeney McBride Hensley
      Wilkinson Wilcox Abbott Saunders Koch Cain Farrell Townsend Love Combs Norman Cline Lloyd Francis Brennan Bryan
      McGee Ballard O'Neill Huffman Wall Kirby Berg Moody Russo Cobb Carey York Morrow Callahan Dalton Pope Underwood
      Huff Kane Boyer Summers Patrick Kirk Conley Walton Horn Briggs Curry Phelps Hancock Logan Morton Floyd Lindsey
      Nicholson Chase Skinner Gibbs Kline Ingram Dillon Allison Walter Burnett Jacobson Atkinson Rich Garrison Vincent
      Greer Cameron Clarke Heath Hines O'Donnell Bruce Booth Carson Blankenship Stein Tyler Randall Hood Poole Nash
      Massey Berger McClure Snow Tanner Nielsen Eaton Davenport Whitaker Nolan Roy Melton Barry Parrish`,
  },
  "black": {
    masculine: `
      Anthony Charles Reginald Derrick Tyrone Larry Eddie Johnny Samuel Andre Jermaine Marcus Calvin Bobby Nathaniel
      Melvin Clarence Maurice Darryl Ronnie Curtis Rodney Darnell Cedric Leroy Henry Carl Demetrius Tony Freddie
      Walter Marvin Billy Roosevelt Jesse Kelvin Dwayne Ernest Alvin Ricky Arthur Jimmy Leon Albert Earl Corey Charlie
      Darrell Jerome Harold Otis Isaiah Sylvester Elijah Tommy Roderick Roy Vincent Stanley Isaac Vernon Dwight Herman
      Eugene Terrell Frederick Lamont Troy Earnest Leonard Alonzo Carlton Dexter Marlon Terrance Louis Rickey Wendell
      Darius Clifton Alfred Bernard Antoine Alphonso Herbert Howard Milton Antonio Austin Wilbert Lonnie Horace Julius
      Donnie Floyd Quincy Damon Quinton Ray Cecil Emmanuel Lloyd Donnell Cleveland Jarvis Clinton Luther Warren
      Theodore Byron Lorenzo Franklin Fredrick Jamal Desmond Kendrick Clyde Terrence Lamar Sherman Lester Cornell
      Daryl Cornelius Moses Clifford Rufus Dewayne Norman Archie`,
    feminine: `
      Brenda Angela Latoya Jacqueline Sharon Gwendolyn Shirley Tiffany Ebony Crystal Carolyn Wanda Vanessa Gloria
      Felicia Betty Latasha Cassandra Dorothy Joyce Jasmine Cheryl Annie Latonya Beverly Yvonne Tamika Denise Yolanda
      Marie Sheila Natasha Tonya Janice Regina Erica Rhonda Monique Ruby Veronica Juanita Valerie Monica April Keisha
      Rose Sylvia Shelia Jean Lillie Doris Tanisha Darlene Evelyn Delores Sabrina Annette Courtney Mattie Tanya Yvette
      Latisha Katrina Tameka Lakisha Anita Phyllis Helen Sonya Carla Alicia Emma Belinda Charlene Marilyn Latanya
      Audrey Ruth Vivian Alice Frances Ethel Mildred Lawanda Geraldine Bernice Charlotte Priscilla Tracey Glenda
      Krystal Tasha Ella Latrice Jeanette Toni Minnie Desiree Hattie Aisha Fannie Marsha Deloris Loretta Thelma Bessie
      Adrienne Jacquelyn Felecia Gladys Paulette Antoinette Maxine Beatrice Octavia Marcia Esther Ernestine Clara
      Erika Rosie Vickie Joy Earnestine Velma Rosalind Norma Candace Geneva Mamie`,
    neutral: `
      Johnnie Jessie Dominique Tommie Ivory Frankie Marion Jackie Ollie Devon Stevie Angel Robbie Aubrey Ashton
      Dorian Kendall Paris Darian Cleo Lavern Noel Elisha Hollis Lorenza Lavon Germaine Alva Chandler Andra Shea Marlo
      Carrol Ali Nicola Kendal`,
    surname: `
      Williams Johnson Jones Brown Jackson Davis Thomas Harris Robinson Taylor Wilson Moore White Lewis Walker Green
      Washington Scott Wright Hill Allen Mitchell Edwards Turner Coleman James Evans Richardson Brooks Jenkins Howard
      Simmons Sanders Henderson Cooper Bell Watson Alexander Butler Bryant Jordan Barnes Woods Dixon Gray Griffin
      Powell Holmes Banks Daniels Perry Patterson Joseph Grant Hunter Henry Owens Marshall Freeman Boyd Gordon
      Franklin Hawkins Sims Hicks Crawford Porter Watkins Jefferson Willis Matthews Mason Fields Reid Hudson Douglas
      Mack Frazier Bradley Greene Harper Charles Byrd Oliver Austin Love Montgomery Burton McCoy Pierre Neal Harvey
      Haynes Wade Hampton Glover Miles Tate Chambers Singleton Hines Curry Hardy Mosley Walton Caldwell Alston
      Roberson Booker Terry Francis Houston McGee Flowers Watts Ingram Dorsey Thornton Stevenson Gaines Stokes Ware
      Clarke Dennis Dawson McKinney Holloway Reese Daniel Tyler Battle Wiggins Clay Rivers Floyd Malone McCray Logan
      Gibbs Townsend Saunders Wilkins Mathis Anthony Pittman McKenzie Norman Benjamin Glenn Boone Lindsey Dickerson
      Branch Monroe Mays Woodard McClain Copeland Bolden Bradford Pitts Louis Randolph Collier Tillman Solomon
      Whitfield Jean Bullock Harrell Bridges Hinton Clayton McNeil Calhoun Wilkerson Cotton O'Neal Wiley Terrell
      Atkins Knox Gilmore Winston Moses Bonner Blackwell Beasley Ruffin Hairston Polk Rucker Heard Cherry Prince
      Gamble Joyner Epps Starks Samuel`,
  },
  "hispanic": {
    masculine: `
      Jose Juan Carlos Luis Daniel Miguel Antonio Manuel Victor Ricardo Francisco Jorge Mario Ruben Roberto Hector
      Oscar Gabriel Anthony Raul Javier Alejandro Pedro Rafael Samuel Fernando Martin Eduardo Ramon Armando Sergio
      Jesse Julio Alberto Johnny Arturo Edgar Omar Andres Enrique Frank Alfredo Benjamin Cesar Alex Salvador Alexander
      Gerardo Gilbert Marco Joel Henry Raymond Orlando Edwin Ernesto Marcos Alfonso Pablo Israel Lorenzo Albert
      Christian Julian Felix Eddie Jimmy Rodolfo Nelson Isaac Gilberto Gustavo Abel Felipe Guillermo Danny Ismael Tony
      Xavier Rudy Ramiro Ivan Louis Nicolas Arthur Rogelio Ernest Josue Diego Esteban Rolando Freddy Saul Efrain Mike
      Hugo Fabian Santiago Tomas Erick Santos Emilio Alfred Humberto Abraham Moises Noe Reynaldo Ralph Marvin Ignacio
      Leonardo Elias Adan Joaquin Vicente Ray Adolfo Milton Benito Agustin Alvaro Mauricio Cristian Rigoberto Freddie
      Domingo Rodrigo Melvin Heriberto`,
    feminine: `
      Maria Jessica Veronica Gloria Martha Yolanda Rosa Sandra Elizabeth Carmen Alicia Teresa Monica Ana Angelica
      Laura Norma Diana Sylvia Olivia Vanessa Leticia Christina Claudia Sonia Adriana Victoria Irma Alma Yesenia Mayra
      Raquel Bertha Virginia Margarita Anna Erica Sara Alejandra Gabriela Erika Emma Juanita Blanca Jacqueline Lorena
      Evelyn Isabel Cecilia Marisol Crystal Esther Julia Dora Maribel Cristina Karina Mercedes Rose Irene Esmeralda
      Luz Daisy Eva Bianca Miriam Yvette Lydia Rita Gladys Alexandra Jasmine Yvonne Carolina Maritza Dolores Ruth
      Hilda Ramona Silvia Frances Angelina Anita Susana Delia Olga Iris Maricela Karla Beatriz Graciela Nora Araceli
      Regina Celia Rocio Amelia Priscilla Clara Juana Abigail Liliana Annette Edith Rosie Elena Marisela Rosalinda
      Marissa Belinda Elsa Desiree Elisa Noemi Lillian Ruby Lourdes Lucia Doris Marlene Lucy Esperanza Felicia
      Consuelo Vivian Josephine Marta Monique Griselda Elva`,
    neutral: `
      Angel Jaime Guadalupe Rene Jessie Lupe Noel Frankie Dominique Trinidad Lorenza Johnnie Alva Pat Natividad
      Elisha Dorian Tommie Kristian Darian Jessy Cleo Germaine Marin Marlo Yuri Jacque Kendal Allyn Bryn Arlyn Adel
      Sami Arie`,
    surname: `
      Garcia Rodriguez Hernandez Martinez Lopez Gonzalez Perez Sanchez Ramirez Torres Flores Rivera Gomez Diaz Cruz
      Morales Reyes Gutierrez Ortiz Chavez Ramos Ruiz Mendoza Alvarez Jimenez Castillo Vasquez Romero Moreno Gonzales
      Herrera Aguilar Medina Vargas Castro Guzman Mendez Fernandez Munoz Salazar Garza Soto Vazquez Alvarado Contreras
      Delgado Pena Rios Guerrero Sandoval Ortega Estrada Nunez Maldonado Dominguez Valdez Vega Santiago Espinoza Rojas
      Silva Mejia Marquez Juarez Padilla Luna Acosta Figueroa Cortez Avila Navarro Molina Ayala Campos Santos Carrillo
      Cervantes Duran Lara Cabrera Solis Miranda Robles Fuentes Salinas Velasquez Ochoa Aguirre Leon Cardenas Rivas
      Calderon Rosales Serrano Castaneda Trujillo Montoya Pacheco Orozco Ibarra Valencia Gallegos Velazquez Camacho
      Guerra Colon Escobar Suarez Salas Macias Villarreal Barrera Franco Zamora Santana Roman Pineda Trevino Rangel
      Arias Lozano Zuniga Mercado Melendez Mora Valenzuela Andrade Meza Villanueva Galvan Tapia Zavala Sosa Velez
      Cisneros Benitez Acevedo Bonilla Arroyo Villa Rubio Bautista Arellano Ponce Huerta Beltran Rocha Villegas Cantu
      Montes Barajas Mata Murillo Rosas Cortes Guevara Salgado Rosario Palacios Davila Esparza Cuevas Cordova Trejo
      Quintero Marin Bravo Corona Medrano Nava Magana Portillo Villalobos Enriquez Esquivel Avalos Bernal Lugo Duarte
      Cano Parra Espinosa Galindo Quintana Alfaro Jaramillo Lucero Correa Reyna Sierra Nieves Saldana Quinones Peralta
      Becerra Amaya Saenz Tovar Vera Leal Cardona Aguilera Zapata Baez Ventura Barrios Castellanos Carrasco Saucedo
      Gallardo Hurtado Guillen Alonso Osorio Muniz Zepeda Escobedo Arredondo Segura Valle Velasco Carranza Felix
      Renteria Blanco Olvera Cordero Quiroz Lemus Caballero Chacon Coronado Orellana Madrigal Granados Paredes Quezada
      Carmona Leyva Hinojosa`,
  },
  "east-asian": {
    masculine: `
      Jun Sang Cheng Dong Takashi Chung Yan Hao Koji Jong Seung Jian Feng Kwok Kwang Tony Jimmy Henry Johnny Danny
      Peter Mike Raymond Andy Samuel Alexander Alex Eddie Tommy Calvin Vincent Kenny Steve Albert Tom Ricky Jim Roy
      Kelvin Stanley Alvin Allen Charlie Bill Eugene Edwin Jay Sam Austin Ken Dan Francis Derrick Don Mathew Benny Ray
      Joey Tim Ben Emmanuel Herman Warren Franklin Sammy Bob Allan Simon Dave Jamal Leo Dexter Isaac Ted Roland Ivan
      Rex Johnathan Chuck Cedric`,
    feminine: `
      Lei Mi Mei Keiko Yoko Eun Akiko Yoshiko Hiroko Soon Hee Jing Pei Hui Jasmine Tina Jenny Helen Grace Tiffany
      Hannah Annie Cindy Anna Anita Alice Evelyn Vivian Ruby Rita Elaine Jocelyn Irene Sylvia Esther Marissa Susie
      Yvonne Edna Maggie Sophia Joy Josephine Lillian Vicky Sue Katelyn Lydia Emma Priscilla Nina June Lucy Amelia
      Jasmin Ivy Mona Angie Joanna Stella Naomi Eva Patty Jeannie Jennie Eunice Pauline Miranda Nora Thelma Bernadette
      Mindy Agnes Serena Lena Aileen Florence Mandy Mae Iris`,
    neutral: `
      Kai Shan Kam Min Hyun Yong Yu Ying Wai Ming Wei Yun Yi Shu Ping Jessie Noel Ali Frankie Jessy Pat Kris Stevie
      Ollie Cleo Cris Trinity Luan Layne Alva Yuri Arlyn`,
    surname: `
      Kim Chen Li Wang Yang Wong Park Lin Liu Chang Huang Wu Zhang Chan Yu Lam Choi Chung Lim Lu Tang Cho Cheng Kang
      Tan Ng Hong Han Chu Xu Zheng Liang Zhou Sun Lau Zhao Chin Zhu Shin Leung Jiang Hu Cheung Lai Yee Hwang Hsu Chau
      Yoon Chow Fong Kwon Yoo Ko Kong Chiu Su Shen Tam Chong Pan Gao Guo Dong Woo Tong Yan Chun Tsai Feng Jin Pak Ahn
      Luo Shi Fang Ye Xie Chou Cha Wei Chao Tu Jang Ong Yun Yuan Eng Liao Kwan Cai Peng Fan Chiang Fu Fung Deng Leong
      Yeung Zeng Choe Mei Du Lei Guan Sung Kuo Suh Seo Yuen Hua Yao Louie Pang Tsang Yeh Min Hung Tanaka Yin Chi
      Nakamura Yamamoto Xiao Hsieh Bae Tse Nam Yip Kao Wen Yim Lui Gong Hui Kwong Quan Lew Mao Wan Gu Jeong Kwok Sato
      Watanabe Zhong Tseng Shih Im Ding Mak Yen Koo Ren Dai Suzuki Zou Qiu Sim Shim`,
  },
  "south-asian": {
    masculine: `
      Amit Ravi Tariq Sanjay Rahul Ajay Rashid Nikhil Vishal Anil Anand Raj Vijay Sameer Sunil Vivek Rohit Rajesh
      Imran Vikram Vinay Ashish Arun Rajiv Ankur Chirag Sachin Rajeev Faisal Manish Deepak Rajan Rakesh Vikas Ashwin
      Asim Shahid Asif Naveen Navin Arif Nitin Gaurav Shyam Sanjeev Nadeem Neeraj Manu Manoj Gautam Prashant Akbar
      Ashok Sumit Raman Ketan Parag Ram Chetan Karthik Tony Jimmy Henry Johnny Danny Peter Mike Raymond Andy Samuel
      Alexander Alex Eddie Tommy Calvin Vincent Kenny Steve Albert Tom`,
    feminine: `
      Chandra Asha Priya Nisha Neha Reena Anjali Seema Leena Indira Manisha Kavita Neena Meera Sheela Shilpa Sonal
      Sunita Deepa Asma Shalini Meena Hina Veena Swati Bina Gita Preeti Sandhya Amita Rubina Poonam Aparna Archana
      Jyoti Priti Rashmi Ritu Neelam Lakshmi Sangeeta Arti Uma Rekha Vidya Geeta Varsha Hetal Smita Usha Anuradha
      Anjana Kavitha Parul Vaishali Neeta Anju Hema Sangita Nalini Jasmine Tina Jenny Helen Grace Tiffany Hannah Annie
      Cindy Anna Anita Alice Evelyn Vivian Ruby Rita Elaine Jocelyn Irene Sylvia`,
    neutral: `
      Krishna Kiran Rama Raja Harpreet Manpreet Gurpreet Mandeep Parminder Jessie Noel Ali Frankie Jessy Pat Kris
      Stevie Ollie Cleo Cris Trinity Luan Layne Alva Yuri Arlyn Sami Dayle Carlin Adel Dann`,
    surname: `
      Patel Singh Khan Shah Sharma Kumar Gupta Desai Rahman Mehta Hussain Chowdhury Mathew Jain Malik Joshi Islam Rao
      Syed Reddy Amin Siddiqui Parikh Prasad Varghese Sandhu Alam Nair Das Qureshi Rana Hossain Chaudhry Shaikh
      Shrestha Agarwal Iqbal Verma Uddin Bhatt Dhillon Rai Arora Sheikh Kulkarni Sidhu Srinivasan Mishra Bhatia
      Mahmood Grewal Akhtar Sheth Iyer Sinha Krishnan Mirza Anand Trivedi Mistry Bhatti Saini Kapoor Ghosh Pandya
      Gurung Subramanian Choudhury Agrawal Zaman Parekh Chandra Soni Srivastava Vyas Shukla Rizvi Thakkar Dhaliwal
      Baig Malhotra Ansari Naik Garg Chacko Raza Modi Chauhan Adhikari Menon Khanna Parmar Patil Chopra Haque
      Chaudhary Banerjee Zaidi Acharya Sethi Aggarwal Doshi Saha Pathak Mukherjee Kapadia Cheema Deshpande Saxena
      Thapa Shetty Narayan Bhandari Randhawa Narayanan Bhat Pradhan Bansal Chawla Goyal Ramachandran Tiwari Sarkar
      Chatterjee Kothari Cherian Shankar Natarajan Kurian Khatri Bajwa Rajan Ahuja Nayak Dalal Dutta Pillai Yadav
      Biswas Vora Mathur Mahajan Mittal Panchal Thakur Pandey Bhagat Vaidya Bhattacharya Datta Hashmi Gautam
      Chakraborty Bhardwaj Basu Chahal Jha Gulati Koshy Kannan Batra Tripathi Prabhu Solanki Chadha Bajaj Kamath Mehra
      Bhargava Dixit Sundaram Upadhyay Goswami Uppal Kapur Pandit Vohra Singhal Sangha Balakrishnan Murthy Kalra
      Sekhon Deshmukh Sehgal Khurana Raghavan Shenoy Ganesan Gopal Tandon Ahluwalia Sengupta Dasgupta Chhabra`,
  },
  "southeast-asian": {
    masculine: `
      Sonny Romeo Samson Benson Long Tuan Huy Danilo Hung Viet Nam Quan Vinh Phong Vu Conrado Hoang Trung Duy Rommel
      Virgilio Cuong Quang Hieu Hai Son Quoc Juanito Thien Joselito Tan Arnel Khoa Tri Phi Toan Duc Romulo Tong Dat
      Thong Phuc Thang Truong Nhan Tony Jimmy Henry Johnny Danny Peter Mike Raymond Andy Samuel Alexander Alex Eddie
      Tommy Calvin Vincent Kenny Steve Albert Tom Victor Ricky Jim Roy Kelvin Stanley Antonio Alvin Allen Charlie Bill
      Eugene Edwin Jay Sam`,
    feminine: `
      Mai Angelita Lolita Erlinda Carmelita Leilani Milagros Evangeline Teresita Estrella Thuy Zenaida Trang Thu Ngoc
      Huong Hanh Lien Loan Yen Hang Nga Trinh Lilibeth Tram Nelia Huyen Tuyet Oanh Nhu Diem Xuan Truc Kieu Ngan
      Corazon Nguyet Quynh Remedios Jasmine Maria Tina Jenny Helen Grace Tiffany Hannah Annie Cindy Anna Anita Alice
      Evelyn Vivian Ruby Rita Daisy Elaine Jocelyn Irene Sylvia Esther Marissa Susie Olivia Yvonne Edna Maggie Sophia
      Joy Josephine Cecilia Lillian Sonia Vicky Sue Katelyn Lydia Emma Priscilla`,
    neutral: `
      Thanh Tam Anh Bao Hoa Hien Khanh Jessie Noel Ali Frankie Jessy Pat Kris Stevie Natividad Ollie Cleo Cris
      Trinity Luan Layne Alva Yuri Trinidad Lorenza Arlyn Sami Dayle Carlin Adel Dann`,
    surname: `
      Nguyen Tran Le Pham Huynh Vang Truong Xiong Phan Vu Vo Ngo Dang Hoang Ly Bui Duong Thao Cao Dinh Luu Mai Trinh
      Her Luong Moua Doan Vue Thai Lor Dao Quach Vuong Ta Phung Saechao Diep Thach Dizon Corpuz Sok Chea Trieu Khang
      Pascua Espiritu Sison Keo Manalo Giang Asuncion Htoo Ancheta Legaspi Banh Galang Tieu Phu Trang Aung Saetern
      Saelee Saephan Viray Khuu Pangilinan Thor Kue Guevarra Meas Cunanan Esguerra Canlas Atienza Soe Tun Mallari
      Tuazon Saeteurn Ouk Phuong Myint Manansala Chanthavong Sunga Panganiban Danh Nguy Voong Nghiem Nhan Umali
      Quiambao Dumlao Chuong Aguinaldo Fontanilla Tram Chhay Marasigan Ilagan Dulay Prak Kieu Khong Bondoc`,
  },
};

// Relative weights for a draw that does not know the person's heritage, read
// off the 2020 Census adult population (us-bench.tsv's reference row). A
// generated American almost never takes this path: the bench draws the group
// its heritage names.
const US_GROUP_WEIGHT: Readonly<Record<UsNameGroupId, number>> = {
  white: 0.654,
  black: 0.117,
  hispanic: 0.168,
  "east-asian": 0.022,
  "south-asian": 0.019,
  "southeast-asian": 0.02,
};

export const US_NAME_GROUPS: Readonly<Record<UsNameGroupId, NameGroup>> = Object.fromEntries(
  (Object.keys(US_NAME_SOURCE) as UsNameGroupId[]).map((id) => {
    const source = US_NAME_SOURCE[id];
    return [
      id,
      NameGroup.parse({
        given: { masculine: words(source.masculine), feminine: words(source.feminine), neutral: words(source.neutral) },
        surname: words(source.surname),
        weight: US_GROUP_WEIGHT[id],
      }),
    ];
  }),
) as Record<UsNameGroupId, NameGroup>;

export const US_NAME_BANK: NameBank = NameBank.parse({ groups: Object.values(US_NAME_GROUPS) });

/**
 * Which American name group a face belongs to. A white official's face is
 * drawn as northern European, and the census "other" group (most of it Native
 * American, whose names in the record are English-origin) as mixed; both take
 * the white group's names.
 */
export const US_NAME_GROUP_BY_HERITAGE: Readonly<Partial<Record<PortraitHeritage, UsNameGroupId>>> = {
  "europe-north": "white",
  "europe-south": "white",
  "europe-east": "white",
  mixed: "white",
  "africa-west": "black",
  "latin-america": "hispanic",
  "east-asia": "east-asian",
  "south-asia": "south-asian",
  "southeast-asia": "southeast-asian",
};

/**
 * Either an authored bank (name-banks.ts), one counted from Wikidata
 * (name-banks.vendored.ts), one of the traditions split out of a shared bank
 * (name-banks-regional.ts), or the American one above.
 */
export type AnyNameCulture = NameCulture | VendoredNameCulture | RegionalNameCulture | "american";

/** Traditions that write the family name first. */
const FAMILY_FIRST: ReadonlySet<string> = new Set(["han", "korean", "vietnamese", "khmer"]);

/** Counted traditions whose second name is already the father's, as their people's records carry it. */
const FATHERS_NAME: ReadonlySet<string> = new Set(["somali", "south-sudanese", "nigerien", "mongolian"]);

/** Every group named for its tradition, and written the way the tradition writes it. */
function identified(culture: string, bank: NameBank): NameBank {
  const form: NameForm | undefined = FAMILY_FIRST.has(culture) ? "family-given" : FATHERS_NAME.has(culture) ? "patronymic" : undefined;
  const single = bank.groups.length === 1;
  return {
    groups: bank.groups.map((group, index) => ({
      ...group,
      id: group.id ?? (single ? culture : `${culture}-${index + 1}`),
      ...(form && !group.form ? { form } : {}),
    })),
  };
}

const RAW_BANKS: Readonly<Record<AnyNameCulture, NameBank>> = {
  ...NAME_BANKS,
  ...VENDORED_NAME_BANKS,
  ...REGIONAL_NAME_BANKS,
  ...composites({
    sothoTswana: VENDORED_NAME_BANKS["sotho-tswana"].groups[0]!,
    anglo: NAME_BANKS.anglo.groups[0]!,
    han: NAME_BANKS.han.groups[0]!,
  }),
  american: US_NAME_BANK,
};

export const ALL_NAME_BANKS: Readonly<Record<AnyNameCulture, NameBank>> = Object.fromEntries(
  Object.entries(RAW_BANKS).map(([culture, bank]) => [culture, identified(culture, bank)]),
) as Record<AnyNameCulture, NameBank>;

/**
 * The tradition a nation's lead chair is named from, where its people draw
 * from several; undefined where they draw from one.
 */
export function leadNameGroup(nation: string): NameGroup | undefined {
  return LEAD_TRADITION[nation];
}

/**
 * The one group a person of this heritage is named from, where the nation's
 * bank is split by heritage. Absent for every bank that is one tradition, which
 * then draws its groups by weight as it always has.
 */
export function nameGroupForHeritage(culture: AnyNameCulture, heritage: PortraitHeritage): NameGroup | undefined {
  if (culture !== "american") return undefined;
  const group = US_NAME_GROUP_BY_HERITAGE[heritage];
  return group === undefined ? undefined : US_NAME_GROUPS[group];
}

const cultures = (entries: Readonly<Partial<Record<AnyNameCulture, string>>>): Record<string, AnyNameCulture> =>
  Object.fromEntries(
    Object.entries(entries).flatMap(([culture, ids]) => (ids as string).split(" ").map((id) => [id, culture as AnyNameCulture])),
  );

/**
 * The naming tradition of each country the roster carries at thin fidelity.
 * The authored countries' traditions are in people.ts. A country with a bank
 * counted from its own citizens' names draws from it; where a bank is shared,
 * it is because the naming is one tradition (Senegal and the Gambia, Czechia
 * and Slovakia, the Polynesian states).
 */
export const ROSTER_NAME_CULTURE: Readonly<Record<string, AnyNameCulture>> = cultures({
  arabic: "SDN JOR LBN PSE",
  "gulf-arabic": "BHR KWT OMN",
  maghrebi: "LBY TUN",
  mauritanian: "MRT",
  chadian: "TCD",
  comorian: "COM",
  maldivian: "MDV",
  lusophone: "AGO MOZ CPV GNB STP TLS PRT",
  french: "HTI MCO SYC",
  hispanic: "DOM CRI SLV GTM HND NIC PAN BOL ECU PRY PER URY AND",
  anglo: "ATG BHS BRB DMA GRD JAM KNA LCA VCT TTO BLZ GUY NZL",
  dutch: "SUR",
  germanic: "AUT LIE LUX",
  italian: "SMR",
  greek: "GRC CYP",
  romanian: "ROU MDA",
  "serbo-croatian": "HRV BIH MNE",
  serbian: "SRB",
  macedonian: "MKD",
  slovene: "SVN",
  bulgarian: "BGR",
  "czech-slovak": "CZE SVK",
  finnish: "FIN",
  estonian: "EST",
  latvian: "LVA",
  lithuanian: "LTU",
  albanian: "ALB XKX",
  georgian: "GEO",
  armenian: "ARM",
  azerbaijani: "AZE",
  kyrgyz: "KGZ",
  tajik: "TJK",
  turkmen: "TKM",
  uzbek: "UZB",
  mongolian: "MNG",
  burmese: "MMR",
  khmer: "KHM",
  lao: "LAO",
  malay: "BRN",
  sinhalese: "LKA",
  nepali: "NPL",
  bhutanese: "BTN",
  malagasy: "MDG",
  maltese: "MLT",
  polynesian: "WSM TON TUV",
  melanesian: "FJI PNG SLB VUT",
  micronesian: "KIR MHL FSM NRU PLW",
  somali: "SOM DJI",
  "great-lakes": "BDI",
  kenyan: "KEN",
  tanzanian: "TZA",
  ugandan: "UGA",
  "south-sudanese": "SSD",
  tigrinya: "ERI",
  senegambian: "SEN GMB",
  mande: "MLI GIN",
  nigerien: "NER",
  burkinabe: "BFA",
  ivorian: "CIV",
  "gbe-speaking": "BEN TGO",
  ghanaian: "GHA",
  "upper-guinea-coast": "LBR SLE",
  cameroonian: "CMR",
  congolese: "COG",
  gabonese: "GAB",
  centrafrican: "CAF",
  equatoguinean: "GNQ",
  zimbabwean: "ZWE",
  "zambian-malawian": "ZMB MWI",
  "sotho-tswana": "BWA LSO",
  namibian: "NAM",
  "southern-african": "SWZ",
  "south-asian": "MUS",
});


// --- Nations that share a bank but not a naming tradition -------------------

/**
 * Where a bank serves several traditions, the part of it one nation's people
 * are actually named from.
 *
 * Drawing the given name and the surname as two free picks from a mixed bank
 * assembles names no one carries: a Pakistani minister called Rahul Qureshi, a
 * Dane with a Swedish -sson, a man surnamed Jonsdottir. A person is named from
 * one tradition, so the draw picks the tradition first and both halves from it.
 */
type Tradition = { readonly group: NameGroup; readonly weight: number };

function section(list: readonly string[], from: string | undefined, to: string | undefined): string[] {
  const start = from === undefined ? 0 : list.indexOf(from);
  const end = to === undefined ? list.length : list.indexOf(to);
  if (start < 0 || end < 0) throw new Error(`name bank section ${from ?? "start"}..${to ?? "end"} is not in the bank`);
  return list.slice(start, end);
}

const SOUTH_ASIAN = NAME_BANKS["south-asian"].groups[0]!;

/**
 * The Muslim run is a third the depth of the Hindu one, too shallow for a
 * Pakistani or Bangladeshi cabinet of forty-odd men to be named without
 * repeats once it is the only run they draw from. These are common Pakistani
 * and Bangladeshi names, Punjabi, Urdu-speaking, Pashtun, Sindhi and Bengali.
 * A few family names that would pair with a given name here into a well-known
 * head of government's are left out, and so is one given name that pairs with
 * the run's commonest surname into a former Prime Minister's.
 */
const MUSLIM_LEFT_OUT: ReadonlySet<string> = new Set(["Imran"]);
const MUSLIM_MORE = {
  masculine: words(`
    Abdullah Asad Babar Danish Ehsan Fawad Ghulam Habib Haider Hamza Haroon Ibrahim Ijaz Jahangir Mahmood Moin
    Nadeem Noman Obaid Owais Qasim Rafiq Rehan Saad Saqib Shoaib Tahir Talha Umar Waleed Waseem Yousuf Zahid Zeeshan
    Aftab Akram Anis Atif Azhar Fahim Hamid Mansoor Mushtaq Naeem Sohail Tanveer Rafiqul Mizanur Mahbub Shafiq
    Anisur Kamrul Mostafa Nurul Saiful Shahidul`),
  feminine: words(`
    Aisha Amna Anam Asma Fariha Faiza Hafsa Huma Iqra Javeria Laila Maham Mehwish Nabila Nimra Rida Saba Sadaf
    Samreen Shaista Sidra Sumaira Tahmina Zara Zoya Rehana Shireen Nasreen Parveen Rubina Shahnaz Tasneem`),
  surname: words(`
    Rahman Hossain Chowdhury Uddin Haque Karim Alam Akhtar Mahmood Rana Gondal Warraich Khattak Afridi Durrani
    Lodhi Memon Soomro Jatoi Kazmi Naqvi Jafri Bukhari Tarar Chattha Bhuiyan Talukder Sikder Molla`),
};

/**
 * The south-asian bank is authored in three runs, Hindu, then Muslim, then
 * Sikh, and each run is named here by the entry that opens it. Kaur stays out
 * of the Sikh surnames: it is the name a Sikh woman carries in place of Singh,
 * and a surname a man could draw has to be one a man carries.
 */
const SOUTH_ASIAN_TRADITIONS = {
  hindu: {
    id: "south-asian-hindu",
    given: {
      masculine: section(SOUTH_ASIAN.given.masculine, undefined, "Ahmed"),
      feminine: section(SOUTH_ASIAN.given.feminine, undefined, "Fatima"),
      neutral: SOUTH_ASIAN.given.neutral,
    },
    surname: section(SOUTH_ASIAN.surname, undefined, "Kaur"),
    weight: 1,
  },
  muslim: {
    id: "south-asian-muslim",
    given: {
      masculine: [
        ...section(SOUTH_ASIAN.given.masculine, "Ahmed", "Harjit").filter((name) => !MUSLIM_LEFT_OUT.has(name)),
        ...MUSLIM_MORE.masculine,
      ],
      feminine: [...section(SOUTH_ASIAN.given.feminine, "Fatima", "Harpreet"), ...MUSLIM_MORE.feminine],
      neutral: SOUTH_ASIAN.given.neutral,
    },
    surname: [...section(SOUTH_ASIAN.surname, "Khan", undefined), ...MUSLIM_MORE.surname],
    weight: 1,
  },
  sikh: {
    id: "south-asian-sikh",
    given: {
      masculine: section(SOUTH_ASIAN.given.masculine, "Harjit", undefined),
      feminine: section(SOUTH_ASIAN.given.feminine, "Harpreet", undefined),
      neutral: SOUTH_ASIAN.given.neutral,
    },
    surname: ["Singh", ...section(SOUTH_ASIAN.surname, "Gill", "Khan")],
    weight: 1,
  },
} satisfies Record<string, NameGroup>;

/**
 * How each nation's people divide among the three, as rounded shares of its
 * population by religion, taken over the runs the bank carries (the Mauritian
 * Christian community is named in French and has no run here). A prior for
 * who is named what, not a measurement of who holds office.
 */
const SOUTH_ASIAN_MIX: Readonly<Record<string, Readonly<Partial<Record<keyof typeof SOUTH_ASIAN_TRADITIONS, number>>>>> = {
  IND: { hindu: 0.83, muslim: 0.15, sikh: 0.02 },
  PAK: { muslim: 1 },
  BGD: { hindu: 0.08, muslim: 0.92 },
  MUS: { hindu: 0.72, muslim: 0.28 },
};

const NORDIC = NAME_BANKS.nordic.groups[0]!;

/** The Icelandic patronymics the old shared bank carried, which belong to Iceland's own tradition below. */
const ICELANDIC_IN_NORDIC: ReadonlySet<string> = new Set([
  "Sigurdsson",
  "Jonsdottir",
  "Magnusdottir",
  "Gunnarsson",
  "Thorsson",
  "Bjarnason",
  "Petursson",
  "Halldorsson",
  "Kristjansson",
]);

/** Family names Norway and Denmark carry and Sweden does not; -sen patronymics are the rest. */
const DANO_NORWEGIAN_ONLY: ReadonlySet<string> = new Set([
  "Haugen", "Hagen", "Solberg", "Moen", "Saether", "Bakke", "Fjeld", "Lie", "Aas", "Rud", "Vik", "Myhre",
  "Moller", "Vestergaard", "Overgaard", "Skov", "Bruun", "Winther",
]);

/** Carried on both sides of the Øresund. */
const SCANDINAVIAN_SHARED: ReadonlySet<string> = new Set(["Berg", "Holm", "Dahl", "Lund", "Strand"]);

const nordicGroup = (id: string, keep: (surname: string) => boolean): NameGroup => ({
  ...NORDIC,
  id,
  surname: NORDIC.surname.filter((surname) => !ICELANDIC_IN_NORDIC.has(surname) && keep(surname)),
});

const SWEDISH = nordicGroup("swedish", (surname) => !surname.endsWith("sen") && !DANO_NORWEGIAN_ONLY.has(surname));
const DANO_NORWEGIAN = nordicGroup(
  "dano-norwegian",
  (surname) => surname.endsWith("sen") || DANO_NORWEGIAN_ONLY.has(surname) || SCANDINAVIAN_SHARED.has(surname),
);

/**
 * Iceland names people for a parent, not a family: Jónsdóttir is Jón's
 * daughter and Jónsson his son. So the "surname" list here is the genitive
 * stem of each father's name, and `surnameFor` adds -son or -dóttir once the
 * person's own presentation is known. The given names are common Icelandic
 * ones; a few that would pair into the names of the country's best-known
 * recent heads of government are left out.
 */
const ICELANDIC_FATHERS: Readonly<Record<string, string>> = {
  Jón: "Jóns", Guðmundur: "Guðmunds", Sigurður: "Sigurðar", Gunnar: "Gunnars", Ólafur: "Ólafs", Einar: "Einars",
  Kristján: "Kristjáns", Magnús: "Magnús", Stefán: "Stefáns", Jóhann: "Jóhanns", Björn: "Björns", Árni: "Árna",
  Helgi: "Helga", Þórður: "Þórðar", Pétur: "Péturs", Páll: "Páls", Halldór: "Halldórs", Ragnar: "Ragnars",
  Haraldur: "Haralds", Hannes: "Hannes", Karl: "Karls", Óskar: "Óskars", Davíð: "Davíðs", Egill: "Egils",
  Friðrik: "Friðriks", Gísli: "Gísla", Hallgrímur: "Hallgríms", Jónas: "Jónas", Kári: "Kára", Snorri: "Snorra",
  Steinar: "Steinars", Sveinn: "Sveins", Tómas: "Tómas", Valdimar: "Valdimars", Þorsteinn: "Þorsteins",
  Ásgeir: "Ásgeirs", Baldur: "Baldurs", Birgir: "Birgis", Gylfi: "Gylfa", Hákon: "Hákonar", Hilmar: "Hilmars",
  Hörður: "Harðar", Ingi: "Inga", Kjartan: "Kjartans", Kristinn: "Kristins", Leifur: "Leifs", Ómar: "Ómars",
  Skúli: "Skúla", Vilhjálmur: "Vilhjálms", Örn: "Arnar", Rúnar: "Rúnars", Brynjar: "Brynjars", Eiríkur: "Eiríks",
  Finnur: "Finns", Ægir: "Ægis", Ari: "Ara", Atli: "Atla", Daði: "Daða", Elías: "Elías", Freyr: "Freys",
  Gestur: "Gests", Hlynur: "Hlyns", Ísak: "Ísaks", Logi: "Loga", Reynir: "Reynis", Sindri: "Sindra",
  Unnar: "Unnars", Viðar: "Viðars", Þór: "Þórs", Arnar: "Arnars", Bragi: "Braga",
};

const ICELANDIC: NameGroup = {
  id: "icelandic",
  form: "patronymic",
  given: {
    masculine: Object.keys(ICELANDIC_FATHERS),
    feminine: words(`
      Guðrún Anna Kristín Sigríður Margrét Helga Sigrún Ingibjörg María Katrín Elín Hildur Ragnheiður Þórunn Ásta
      Bryndís Erla Guðný Hanna Harpa Inga Íris Lilja Rakel Sara Sólveig Steinunn Svava Unnur Valgerður Þóra Auður
      Arna Berglind Birna Björk Dagný Edda Elísabet Eva Fanney Freyja Gerður Guðbjörg Heiða Heiðrún Hrafnhildur Hulda
      Kolbrún Lára Linda Ólöf Rósa Ragna Sunna Tinna Þórdís Agnes Aldís Bergþóra Embla Eydís Hafdís Hrund Iðunn
      Jórunn Oddný Rannveig Sesselja Snædís`),
    neutral: [],
  },
  surname: Object.values(ICELANDIC_FATHERS),
  weight: 1,
};

const ICELAND = "ISL";

/**
 * North Macedonia's two traditions. The bank counted over its citizens mixes
 * Macedonian names with the Albanian ones a quarter of them carry, so an
 * Albanian given name met a Macedonian surname; the Macedonian group here
 * keeps only the names the Albanian bank does not carry, and Albanian
 * Macedonians draw from the Albanian bank.
 */
const ALBANIAN_NAMES: ReadonlySet<string> = new Set(
  VENDORED_NAME_BANKS.albanian.groups.flatMap((group) => [...group.given.masculine, ...group.given.feminine, ...group.given.neutral]),
);
const MACEDONIAN_COUNTED = VENDORED_NAME_BANKS.macedonian.groups[0]!;
const macedonianOnly = (list: readonly string[]) => list.filter((name) => !ALBANIAN_NAMES.has(name));
const MACEDONIAN_MASCULINE = macedonianOnly(MACEDONIAN_COUNTED.given.masculine);
const MACEDONIAN_FEMININE = macedonianOnly(MACEDONIAN_COUNTED.given.feminine);
/** Topped up to the bank's floor from the least common names of each sex, as the counted banks are. */
const MACEDONIAN_NEUTRAL = [
  ...macedonianOnly(MACEDONIAN_COUNTED.given.neutral),
  ...MACEDONIAN_MASCULINE.slice(-4),
  ...MACEDONIAN_FEMININE.slice(-4),
];
const MACEDONIAN: NameGroup = NameGroup.parse({
  ...MACEDONIAN_COUNTED,
  id: "macedonian",
  given: { masculine: MACEDONIAN_MASCULINE, feminine: MACEDONIAN_FEMININE, neutral: MACEDONIAN_NEUTRAL },
});

const NATION_TRADITIONS: Readonly<Record<string, readonly Tradition[]>> = {
  ...Object.fromEntries(
    Object.entries(SOUTH_ASIAN_MIX).map(([nation, mix]) => [
      nation,
      (Object.keys(SOUTH_ASIAN_TRADITIONS) as (keyof typeof SOUTH_ASIAN_TRADITIONS)[]).flatMap((key) =>
        (mix[key] ?? 0) > 0 ? [{ group: SOUTH_ASIAN_TRADITIONS[key], weight: mix[key]! }] : [],
      ),
    ]),
  ),
  SWE: [{ group: SWEDISH, weight: 1 }],
  NOR: [{ group: DANO_NORWEGIAN, weight: 1 }],
  DNK: [{ group: DANO_NORWEGIAN, weight: 1 }],
  [ICELAND]: [{ group: ICELANDIC, weight: 1 }],
  MKD: [
    { group: MACEDONIAN, weight: 0.75 },
    { group: { ...VENDORED_NAME_BANKS.albanian.groups[0]!, id: "albanian" }, weight: 0.25 },
  ],
};

/**
 * The bank a nation's people are named from: its culture's own, narrowed to
 * the traditions the nation itself follows where the bank serves several.
 */
export function nationNameBank(nation: string, culture: AnyNameCulture): NameBank {
  return NATION_BANKS.get(nation) ?? ALL_NAME_BANKS[culture];
}

/**
 * Every tradition by its id, from every bank and every nation's own split, so
 * a draw can be read back against a list of traditions kept outside the banks.
 */
export function nameGroupById(id: string): NameGroup | undefined {
  return GROUPS_BY_ID.get(id);
}

const NATION_BANKS: ReadonlyMap<string, NameBank> = new Map(
  Object.entries(NATION_TRADITIONS).map(([nation, traditions]) => [
    nation,
    { groups: traditions.map(({ group, weight }) => ({ ...group, weight })) },
  ]),
);

const GROUPS_BY_ID: ReadonlyMap<string, NameGroup> = new Map(
  [...Object.values(ALL_NAME_BANKS), ...NATION_BANKS.values()]
    .flatMap((bank) => bank.groups)
    .filter((group) => group.id !== undefined)
    .map((group) => [group.id!, group] as const),
);
