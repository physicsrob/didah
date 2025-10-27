/**
 * Call sign generation utilities
 */
interface LocationArea {
  patterns: string[];
  qths: string[];
  weight: number;
}

const locationAreas: LocationArea[] = [
  // USA - Call Area 1 (New England)
  {
    patterns: ['W1[A-Z]{3}', 'K1[A-Z]{3}', 'N1[A-Z]{2,3}', 'KB1[A-Z]{3}'],
    qths: [
      'BOSTON MA', 'PORTLAND ME', 'HARTFORD CT', 'PROVIDENCE RI',
      'BURLINGTON VT', 'MANCHESTER NH', 'BANGOR ME',
      'MA', 'MASS', 'MASSACHUSETTS', 'CT', 'CONN', 'CONNECTICUT',
      'ME', 'MAINE', 'NH', 'VT', 'VERMONT', 'RI',
      'NEW ENGLAND', 'NE USA', 'FN42', 'FN43', 'FN31', 'FN41',
      'CAPE COD', 'NEAR BOSTON', 'NORTH OF BOSTON', 'COASTAL ME'
    ],
    weight: 8
  },

  // USA - Call Area 2 (NY, NJ)
  {
    patterns: ['W2[A-Z]{3}', 'K2[A-Z]{3}', 'N2[A-Z]{2,3}', 'KB2[A-Z]{3}'],
    qths: [
      'NEW YORK NY', 'NYC NY', 'BUFFALO NY', 'ROCHESTER NY', 'ALBANY NY',
      'NEWARK NJ', 'JERSEY CITY NJ', 'SYRACUSE NY', 'YONKERS NY',
      'NY', 'NEW YORK', 'NJ', 'NEW JERSEY', 'JERSEY',
      'UPSTATE NY', 'DOWNSTATE NY', 'LONG ISLAND NY', 'LI NY',
      'FN20', 'FN21', 'FN30', 'FN31', 'FN12',
      'METRO NYC', 'TRI STATE', 'NEAR NYC', 'HUDSON VALLEY',
      'MANHATTAN', 'QUEENS', 'BROOKLYN', 'CENTRAL NY'
    ],
    weight: 12
  },

  // USA - Call Area 3 (PA, DE, MD, DC)
  {
    patterns: ['W3[A-Z]{3}', 'K3[A-Z]{3}', 'N3[A-Z]{2,3}', 'KB3[A-Z]{3}'],
    qths: [
      'PHILADELPHIA PA', 'PHILLY PA', 'PITTSBURGH PA', 'BALTIMORE MD',
      'WASHINGTON DC', 'DC', 'WILMINGTON DE', 'HARRISBURG PA',
      'PA', 'PENNA', 'PENNSYLVANIA', 'MD', 'MARYLAND', 'DE', 'DELAWARE',
      'FN20', 'FM19', 'FM29', 'FN00', 'FN10',
      'EASTERN PA', 'WESTERN PA', 'CENTRAL PA', 'NEAR PHILLY',
      'NEAR DC', 'CHESAPEAKE', 'DMV AREA'
    ],
    weight: 10
  },

  // USA - Call Area 4 (Southeast)
  {
    patterns: ['W4[A-Z]{3}', 'K4[A-Z]{3}', 'N4[A-Z]{2,3}', 'KB4[A-Z]{3}'],
    qths: [
      'ATLANTA GA', 'ATL GA', 'MIAMI FL', 'CHARLOTTE NC', 'NASHVILLE TN',
      'RICHMOND VA', 'RALEIGH NC', 'TAMPA FL', 'ORLANDO FL',
      'BIRMINGHAM AL', 'CHARLESTON SC', 'JACKSONVILLE FL',
      'GA', 'GEORGIA', 'FL', 'FLA', 'FLORIDA', 'NC', 'NORTH CAROLINA',
      'SC', 'SOUTH CAROLINA', 'TN', 'TENN', 'TENNESSEE', 'VA', 'VIRGINIA',
      'AL', 'ALABAMA', 'KY', 'KENTUCKY',
      'EM84', 'EM73', 'EM74', 'EM75', 'EM66', 'EL87', 'EL97',
      'SOUTH FLORIDA', 'NORTH FLORIDA', 'CENTRAL FL', 'PANHANDLE',
      'SOUTHEAST', 'THE SOUTH', 'NEAR ATLANTA', 'COASTAL GA'
    ],
    weight: 10
  },

  // USA - Call Area 5 (South Central)
  {
    patterns: ['W5[A-Z]{3}', 'K5[A-Z]{3}', 'N5[A-Z]{2,3}', 'KB5[A-Z]{3}'],
    qths: [
      'HOUSTON TX', 'DALLAS TX', 'AUSTIN TX', 'SAN ANTONIO TX',
      'NEW ORLEANS LA', 'NOLA LA', 'OKLAHOMA CITY OK', 'OKC OK',
      'LITTLE ROCK AR', 'ALBUQUERQUE NM', 'ABQ NM', 'TULSA OK',
      'TX', 'TEXAS', 'LA', 'LOUISIANA', 'OK', 'OKLA', 'OKLAHOMA',
      'AR', 'ARKANSAS', 'NM', 'NEW MEXICO',
      'EM10', 'EM12', 'EM20', 'EM50', 'DM62', 'DM72',
      'NORTH TEXAS', 'SOUTH TEXAS', 'CENTRAL TX', 'EAST TEXAS',
      'GULF COAST', 'NEAR HOUSTON', 'DFW AREA', 'BAYOU COUNTRY'
    ],
    weight: 10
  },

  // USA - Call Area 6 (California)
  {
    patterns: ['W6[A-Z]{3}', 'K6[A-Z]{3}', 'N6[A-Z]{2,3}', 'KB6[A-Z]{3}'],
    qths: [
      'SAN FRANCISCO CA', 'SF CA', 'LOS ANGELES CA', 'LA CA',
      'SAN DIEGO CA', 'SACRAMENTO CA', 'SAC CA', 'SAN JOSE CA',
      'OAKLAND CA', 'BERKELEY CA', 'FRESNO CA', 'LONG BEACH CA',
      'PASADENA CA', 'SANTA BARBARA CA', 'RIVERSIDE CA',
      'CA', 'CALIF', 'CALIFORNIA', 'SOCAL', 'NORCAL',
      'CM87', 'CM97', 'CM86', 'CM88', 'DM03', 'DM04', 'DM13', 'DM14',
      'BAY AREA CA', 'SILICON VALLEY', 'ORANGE COUNTY', 'OC CA',
      'CENTRAL VALLEY', 'INLAND EMPIRE', 'NEAR SF', 'NEAR LA',
      'NORTH OF LA', 'SOUTH OF SF', 'SIERRA FOOTHILLS',
      'COASTAL CALIFORNIA', 'CENTRAL CA', 'WINE COUNTRY'
    ],
    weight: 16
  },

  // USA - Call Area 7 (Pacific NW & Mountain)
  {
    patterns: ['W7[A-Z]{3}', 'K7[A-Z]{3}', 'N7[A-Z]{2,3}', 'KB7[A-Z]{3}'],
    qths: [
      'SEATTLE WA', 'PORTLAND OR', 'PHOENIX AZ', 'PHX AZ',
      'DENVER CO', 'BOISE ID', 'SALT LAKE CITY UT', 'SLC UT',
      'LAS VEGAS NV', 'VEGAS NV', 'SPOKANE WA', 'TACOMA WA',
      'TUCSON AZ', 'RENO NV', 'BILLINGS MT',
      'WA', 'WASH', 'WASHINGTON', 'OR', 'OREGON', 'AZ', 'ARIZONA',
      'CO', 'COLO', 'COLORADO', 'ID', 'IDAHO', 'UT', 'UTAH',
      'NV', 'NEVADA', 'MT', 'MONTANA', 'WY', 'WYOMING',
      'CN87', 'CN88', 'DN07', 'DN17', 'DM43', 'DM33', 'DM13',
      'PNW', 'PACIFIC NORTHWEST', 'PUGET SOUND', 'EASTERN WA',
      'NEAR SEATTLE', 'NEAR PORTLAND', 'ROCKIES', 'ROCKY MTNS',
      'CASCADES', 'FRONT RANGE', 'INTERMOUNTAIN WEST'
    ],
    weight: 10
  },

  // USA - Call Area 8 (Great Lakes)
  {
    patterns: ['W8[A-Z]{3}', 'K8[A-Z]{3}', 'N8[A-Z]{2,3}', 'KB8[A-Z]{3}'],
    qths: [
      'DETROIT MI', 'CLEVELAND OH', 'COLUMBUS OH', 'CINCINNATI OH',
      'GRAND RAPIDS MI', 'TOLEDO OH', 'AKRON OH', 'CHARLESTON WV',
      'MI', 'MICH', 'MICHIGAN', 'OH', 'OHIO', 'WV', 'WEST VIRGINIA',
      'EN82', 'EN91', 'EM89', 'EM79', 'EN80',
      'GREAT LAKES', 'MIDWEST', 'NEAR DETROIT', 'NEAR CLEVELAND',
      'SOUTHEAST MI', 'NORTHERN OH', 'LAKE ERIE'
    ],
    weight: 8
  },

  // USA - Call Area 9 (Midwest)
  {
    patterns: ['W9[A-Z]{3}', 'K9[A-Z]{3}', 'N9[A-Z]{2,3}', 'KB9[A-Z]{3}'],
    qths: [
      'CHICAGO IL', 'CHI IL', 'INDIANAPOLIS IN', 'INDY IN',
      'MILWAUKEE WI', 'MADISON WI', 'FORT WAYNE IN', 'ROCKFORD IL',
      'IL', 'ILL', 'ILLINOIS', 'IN', 'IND', 'INDIANA', 'WI', 'WISC', 'WISCONSIN',
      'EN52', 'EN62', 'EN51', 'EN61', 'EN53',
      'CHICAGOLAND', 'NEAR CHICAGO', 'SOUTHERN WI', 'NORTHERN IN',
      'LAKE MICHIGAN', 'MIDWEST'
    ],
    weight: 8
  },

  // USA - Call Area 0 (Central Plains)
  {
    patterns: ['W0[A-Z]{3}', 'K0[A-Z]{3}', 'N0[A-Z]{2,3}', 'KB0[A-Z]{3}'],
    qths: [
      'KANSAS CITY MO', 'KC MO', 'ST LOUIS MO', 'STL MO',
      'MINNEAPOLIS MN', 'MPLS MN', 'OMAHA NE', 'DES MOINES IA',
      'WICHITA KS', 'FARGO ND', 'SIOUX FALLS SD',
      'MO', 'MISSOURI', 'MN', 'MINN', 'MINNESOTA', 'IA', 'IOWA',
      'KS', 'KANSAS', 'NE', 'NEBR', 'NEBRASKA', 'ND', 'NORTH DAKOTA',
      'SD', 'SOUTH DAKOTA',
      'EN34', 'EN35', 'EN36', 'EM48', 'EM38', 'DN70',
      'GREAT PLAINS', 'MIDWEST', 'TWIN CITIES', 'NEAR KC',
      'CENTRAL MO', 'EASTERN NE'
    ],
    weight: 8
  },
  
  // Canada - VE1 (Maritimes)
  {
    patterns: ['VE1[A-Z]{2,3}', 'VA1[A-Z]{2,3}'],
    qths: [
      'HALIFAX NS', 'ST JOHN NB', 'CHARLOTTETOWN PE',
      'MONCTON NB', 'NS', 'NOVA SCOTIA', 'NB', 'NEW BRUNSWICK',
      'PE', 'PEI', 'PRINCE EDWARD ISLAND', 'FN74', 'FN84',
      'MARITIMES', 'ATLANTIC CANADA'
    ],
    weight: 2
  },

  // Canada - VE2 (Quebec)
  {
    patterns: ['VE2[A-Z]{2,3}', 'VA2[A-Z]{2,3}'],
    qths: [
      'MONTREAL QC', 'QUEBEC CITY QC', 'LAVAL QC', 'GATINEAU QC',
      'QC', 'QUEBEC', 'FN25', 'FN35', 'FN36', 'FN26',
      'NEAR MONTREAL', 'EASTERN QC', 'LA BELLE PROVINCE'
    ],
    weight: 3
  },

  // Canada - VE3 (Ontario)
  {
    patterns: ['VE3[A-Z]{2,3}', 'VA3[A-Z]{2,3}'],
    qths: [
      'TORONTO ON', 'OTTAWA ON', 'HAMILTON ON', 'LONDON ON',
      'KITCHENER ON', 'WINDSOR ON', 'MISSISSAUGA ON',
      'ON', 'ONT', 'ONTARIO', 'FN03', 'FN04', 'FN25', 'EN96',
      'GTA', 'GREATER TORONTO', 'SOUTHERN ON', 'EASTERN ON',
      'NEAR TORONTO', 'GOLDEN HORSESHOE'
    ],
    weight: 6
  },

  // Canada - VE4 (Manitoba)
  {
    patterns: ['VE4[A-Z]{2,3}', 'VA4[A-Z]{2,3}'],
    qths: ['WINNIPEG MB', 'BRANDON MB', 'MB', 'MANITOBA', 'EN19', 'CENTRAL CANADA'],
    weight: 2
  },

  // Canada - VE5 (Saskatchewan)
  {
    patterns: ['VE5[A-Z]{2,3}', 'VA5[A-Z]{2,3}'],
    qths: ['REGINA SK', 'SASKATOON SK', 'SK', 'SASK', 'SASKATCHEWAN', 'DO71', 'PRAIRIES'],
    weight: 2
  },

  // Canada - VE6 (Alberta)
  {
    patterns: ['VE6[A-Z]{2,3}', 'VA6[A-Z]{2,3}'],
    qths: ['CALGARY AB', 'EDMONTON AB', 'RED DEER AB', 'AB', 'ALTA', 'ALBERTA', 'DO33', 'DO23', 'NEAR CALGARY'],
    weight: 2
  },

  // Canada - VE7 (British Columbia)
  {
    patterns: ['VE7[A-Z]{2,3}', 'VA7[A-Z]{2,3}'],
    qths: [
      'VANCOUVER BC', 'VICTORIA BC', 'KELOWNA BC', 'SURREY BC',
      'BC', 'BRITISH COLUMBIA', 'CN88', 'CN89', 'CN79',
      'LOWER MAINLAND', 'VANCOUVER ISLAND', 'VI', 'WEST COAST'
    ],
    weight: 3
  },
  
  // UK - England, Wales, Northern Ireland
  {
    patterns: ['G[0-9][A-Z]{3}', 'M[0-9][A-Z]{3}', '2E[0-9][A-Z]{3}'],
    qths: [
      'LONDON', 'MANCHESTER', 'BIRMINGHAM', 'LEEDS', 'LIVERPOOL',
      'BRISTOL', 'CARDIFF', 'BELFAST', 'SOUTHAMPTON', 'BRIGHTON',
      'UK', 'ENGLAND', 'WALES', 'CYMRU', 'NORTHERN IRELAND',
      'IO91', 'IO81', 'IO82', 'IO83', 'IO92', 'IO93',
      'SOUTHEAST UK', 'NORTHWEST UK', 'MIDLANDS', 'NEAR LONDON',
      'SOUTH COAST', 'NORTH OF ENGLAND', 'HOME COUNTIES'
    ],
    weight: 6
  },

  // UK - Scotland
  {
    patterns: ['GM[0-9][A-Z]{2,3}', 'MM[0-9][A-Z]{3}'],
    qths: [
      'GLASGOW', 'EDINBURGH', 'ABERDEEN', 'DUNDEE',
      'SCOTLAND', 'IO86', 'IO87', 'IO77',
      'CENTRAL SCOTLAND', 'HIGHLANDS', 'LOWLANDS'
    ],
    weight: 2
  },

  // Germany
  {
    patterns: ['DL[0-9][A-Z]{2,3}', 'DJ[0-9][A-Z]{2,3}', 'DK[0-9][A-Z]{2,3}'],
    qths: [
      'BERLIN', 'HAMBURG', 'MUNICH', 'COLOGNE', 'FRANKFURT',
      'STUTTGART', 'DUSSELDORF', 'LEIPZIG', 'DRESDEN',
      'GERMANY', 'DEUTSCHLAND', 'DL', 'JO31', 'JO32', 'JO53', 'JO62',
      'NORTH GERMANY', 'SOUTH GERMANY', 'BAVARIA', 'NEAR BERLIN'
    ],
    weight: 6
  },

  // France
  {
    patterns: ['F[0-9][A-Z]{2,3}'],
    qths: [
      'PARIS', 'MARSEILLE', 'LYON', 'TOULOUSE', 'NICE',
      'BORDEAUX', 'LILLE', 'FRANCE', 'JN18', 'JN23', 'JN33',
      'SOUTHERN FRANCE', 'NORTH FRANCE', 'NEAR PARIS', 'COTE D AZUR'
    ],
    weight: 4
  },

  // Spain
  {
    patterns: ['EA[0-9][A-Z]{2,3}'],
    qths: [
      'MADRID', 'BARCELONA', 'VALENCIA', 'SEVILLE', 'BILBAO',
      'SPAIN', 'ESPANA', 'EA', 'IN80', 'JN01', 'JN11',
      'NORTH SPAIN', 'SOUTH SPAIN', 'COSTA DEL SOL', 'NEAR MADRID'
    ],
    weight: 3
  },

  // Italy
  {
    patterns: ['I[0-9][A-Z]{2,3}'],
    qths: [
      'ROME', 'MILAN', 'NAPLES', 'TURIN', 'FLORENCE',
      'VENICE', 'BOLOGNA', 'ITALY', 'ITALIA', 'JN45', 'JN54', 'JN63',
      'NORTHERN ITALY', 'SOUTHERN ITALY', 'NEAR ROME', 'TUSCANY'
    ],
    weight: 3
  },

  // Netherlands
  {
    patterns: ['PA[0-9][A-Z]{2,3}', 'PD[0-9][A-Z]{2,3}'],
    qths: [
      'AMSTERDAM', 'ROTTERDAM', 'THE HAGUE', 'UTRECHT',
      'NETHERLANDS', 'HOLLAND', 'NL', 'JO21', 'JO22', 'JO32',
      'NEAR AMSTERDAM'
    ],
    weight: 2
  },

  // Belgium
  {
    patterns: ['ON[0-9][A-Z]{2,3}'],
    qths: [
      'BRUSSELS', 'ANTWERP', 'GHENT', 'BRUGES',
      'BELGIUM', 'BELGIQUE', 'JO20', 'JO21', 'JO10'
    ],
    weight: 1.5
  },

  // Poland
  {
    patterns: ['SP[0-9][A-Z]{2,3}', 'SQ[0-9][A-Z]{2,3}'],
    qths: [
      'WARSAW', 'KRAKOW', 'GDANSK', 'POZNAN',
      'POLAND', 'POLSKA', 'JO81', 'JO91', 'KO02',
      'SOUTHERN POLAND', 'NORTHERN POLAND'
    ],
    weight: 2
  },

  // Sweden
  {
    patterns: ['SM[0-9][A-Z]{2,3}', 'SA[0-9][A-Z]{2,3}'],
    qths: [
      'STOCKHOLM', 'GOTHENBURG', 'MALMO', 'UPPSALA',
      'SWEDEN', 'SVERIGE', 'JO99', 'JO89', 'JO65',
      'SOUTHERN SWEDEN', 'NEAR STOCKHOLM'
    ],
    weight: 2
  },

  // Norway
  {
    patterns: ['LA[0-9][A-Z]{2,3}'],
    qths: [
      'OSLO', 'BERGEN', 'TRONDHEIM', 'STAVANGER',
      'NORWAY', 'NORGE', 'JP20', 'JO59', 'JO39',
      'SOUTHERN NORWAY', 'WESTERN NORWAY'
    ],
    weight: 1.5
  },

  // Finland
  {
    patterns: ['OH[0-9][A-Z]{2,3}'],
    qths: [
      'HELSINKI', 'TAMPERE', 'TURKU', 'OULU',
      'FINLAND', 'SUOMI', 'KP20', 'KP10', 'KP30',
      'SOUTHERN FINLAND'
    ],
    weight: 1.5
  },

  // Denmark
  {
    patterns: ['OZ[0-9][A-Z]{2,3}'],
    qths: [
      'COPENHAGEN', 'AARHUS', 'ODENSE',
      'DENMARK', 'DANMARK', 'JO55', 'JO45', 'JO65'
    ],
    weight: 1.5
  },

  // Russia
  {
    patterns: ['R[A-Z][0-9][A-Z]{2,3}', 'U[A-Z][0-9][A-Z]{2,3}'],
    qths: [
      'MOSCOW', 'ST PETERSBURG', 'NOVOSIBIRSK', 'EKATERINBURG',
      'VLADIVOSTOK', 'RUSSIA', 'KO85', 'KO59', 'LO03', 'MO77',
      'EUROPEAN RUSSIA', 'SIBERIA', 'FAR EAST', 'NEAR MOSCOW'
    ],
    weight: 4
  },
  
  // Japan - Area 1 (Kanto)
  {
    patterns: ['JA1[A-Z]{2,3}', 'JR1[A-Z]{2,3}', 'JE1[A-Z]{2,3}'],
    qths: [
      'TOKYO', 'YOKOHAMA', 'CHIBA', 'SAITAMA',
      'JAPAN', 'JA', 'PM95', 'PM96', 'PM97', 'QM05',
      'KANTO', 'NEAR TOKYO', 'GREATER TOKYO'
    ],
    weight: 4
  },

  // Japan - Area 2 (Chubu/Tokai)
  {
    patterns: ['JA2[A-Z]{2,3}', 'JR2[A-Z]{2,3}'],
    qths: ['NAGOYA', 'SHIZUOKA', 'JAPAN', 'PM84', 'PM85', 'CHUBU', 'TOKAI'],
    weight: 2
  },

  // Japan - Area 3 (Kinki/Kansai)
  {
    patterns: ['JA3[A-Z]{2,3}', 'JR3[A-Z]{2,3}'],
    qths: ['OSAKA', 'KYOTO', 'KOBE', 'JAPAN', 'PM74', 'PM84', 'KANSAI', 'KINKI'],
    weight: 3
  },

  // Japan - Area 6 (Kyushu)
  {
    patterns: ['JA6[A-Z]{2,3}', 'JR6[A-Z]{2,3}'],
    qths: ['FUKUOKA', 'KUMAMOTO', 'NAGASAKI', 'JAPAN', 'PM51', 'PM52', 'KYUSHU'],
    weight: 1.5
  },

  // Australia - VK1 (ACT)
  {
    patterns: ['VK1[A-Z]{2,3}'],
    qths: ['CANBERRA', 'ACT', 'AUSTRALIA', 'VK', 'QF44', 'AUSTRALIAN CAPITAL'],
    weight: 1
  },

  // Australia - VK2 (NSW)
  {
    patterns: ['VK2[A-Z]{2,3}'],
    qths: [
      'SYDNEY', 'NEWCASTLE', 'WOLLONGONG', 'NSW', 'NEW SOUTH WALES',
      'AUSTRALIA', 'VK', 'QF56', 'QF55', 'QF44', 'NEAR SYDNEY'
    ],
    weight: 2
  },

  // Australia - VK3 (VIC)
  {
    patterns: ['VK3[A-Z]{2,3}'],
    qths: [
      'MELBOURNE', 'GEELONG', 'BALLARAT', 'VIC', 'VICTORIA',
      'AUSTRALIA', 'VK', 'QF22', 'QF21', 'NEAR MELBOURNE'
    ],
    weight: 1.5
  },

  // Australia - VK4 (QLD)
  {
    patterns: ['VK4[A-Z]{2,3}'],
    qths: [
      'BRISBANE', 'GOLD COAST', 'TOWNSVILLE', 'QLD', 'QUEENSLAND',
      'AUSTRALIA', 'VK', 'QG62', 'QG52', 'NEAR BRISBANE'
    ],
    weight: 1.5
  },

  // Australia - VK5 (SA)
  {
    patterns: ['VK5[A-Z]{2,3}'],
    qths: ['ADELAIDE', 'SA', 'SOUTH AUSTRALIA', 'AUSTRALIA', 'VK', 'PF95'],
    weight: 0.5
  },

  // Australia - VK6 (WA)
  {
    patterns: ['VK6[A-Z]{2,3}'],
    qths: ['PERTH', 'WA', 'WESTERN AUSTRALIA', 'AUSTRALIA', 'VK', 'OF87', 'OF88'],
    weight: 0.5
  },

  // New Zealand
  {
    patterns: ['ZL[1-4][A-Z]{2,3}'],
    qths: [
      'AUCKLAND', 'WELLINGTON', 'CHRISTCHURCH', 'HAMILTON',
      'NEW ZEALAND', 'NZ', 'ZL', 'RF73', 'RF83', 'RE66',
      'NORTH ISLAND', 'SOUTH ISLAND', 'NEAR AUCKLAND'
    ],
    weight: 1.5
  },

  // South Korea
  {
    patterns: ['HL[0-9][A-Z]{2,3}', 'DS[0-9][A-Z]{2,3}'],
    qths: [
      'SEOUL', 'BUSAN', 'INCHEON', 'DAEGU',
      'SOUTH KOREA', 'KOREA', 'PM36', 'PM37', 'PM35',
      'NEAR SEOUL'
    ],
    weight: 2
  },

  // China
  {
    patterns: ['BY[0-9][A-Z]{2,3}', 'BA[0-9][A-Z]{2,3}'],
    qths: [
      'BEIJING', 'SHANGHAI', 'GUANGZHOU', 'SHENZHEN',
      'CHINA', 'PRC', 'OM89', 'PM01', 'OL72',
      'NEAR BEIJING', 'SOUTHERN CHINA', 'NORTHERN CHINA'
    ],
    weight: 2
  },
  
  // Brazil - PY1 (Rio de Janeiro)
  {
    patterns: ['PY1[A-Z]{2,3}', 'PP1[A-Z]{2,3}'],
    qths: ['RIO DE JANEIRO', 'RIO', 'RJ', 'BRAZIL', 'GG87', 'GG77', 'NEAR RIO'],
    weight: 1.5
  },

  // Brazil - PY2 (Sao Paulo)
  {
    patterns: ['PY2[A-Z]{2,3}', 'PP2[A-Z]{2,3}'],
    qths: [
      'SAO PAULO', 'CAMPINAS', 'SANTOS', 'SP', 'BRAZIL',
      'GG66', 'GG77', 'NEAR SP', 'GREATER SAO PAULO'
    ],
    weight: 2
  },

  // Brazil - PY3 (Rio Grande do Sul)
  {
    patterns: ['PY3[A-Z]{2,3}', 'PP3[A-Z]{2,3}'],
    qths: ['PORTO ALEGRE', 'RS', 'RIO GRANDE DO SUL', 'BRAZIL', 'GF49', 'SOUTHERN BRAZIL'],
    weight: 1
  },

  // Brazil - Other areas
  {
    patterns: ['PY[4-9][A-Z]{2,3}', 'PP[4-9][A-Z]{2,3}'],
    qths: [
      'BELO HORIZONTE', 'BRASILIA', 'SALVADOR', 'FORTALEZA',
      'RECIFE', 'CURITIBA', 'MANAUS', 'BRAZIL', 'BRASIL',
      'CENTRAL BRAZIL', 'NORTHEAST BRAZIL', 'AMAZON'
    ],
    weight: 1.5
  },

  // Argentina
  {
    patterns: ['LU[0-9][A-Z]{2,3}', 'LW[0-9][A-Z]{2,3}'],
    qths: [
      'BUENOS AIRES', 'BA', 'CORDOBA', 'ROSARIO', 'MENDOZA',
      'ARGENTINA', 'GF05', 'FF77', 'FF88',
      'NEAR BUENOS AIRES', 'PAMPAS', 'PATAGONIA'
    ],
    weight: 2
  },

  // Chile
  {
    patterns: ['CE[0-9][A-Z]{2,3}', 'CA[0-9][A-Z]{2,3}'],
    qths: [
      'SANTIAGO', 'VALPARAISO', 'CONCEPCION', 'CHILE',
      'FF58', 'FF48', 'NEAR SANTIAGO', 'CENTRAL CHILE'
    ],
    weight: 1.5
  },

  // Colombia
  {
    patterns: ['HK[0-9][A-Z]{2,3}'],
    qths: [
      'BOGOTA', 'MEDELLIN', 'CALI', 'BARRANQUILLA',
      'COLOMBIA', 'FJ29', 'FJ19', 'NEAR BOGOTA', 'ANDEAN COLOMBIA'
    ],
    weight: 1.5
  },

  // Mexico - XE1 (Central)
  {
    patterns: ['XE1[A-Z]{2,3}'],
    qths: [
      'MEXICO CITY', 'CDMX', 'PUEBLA', 'TOLUCA',
      'MEXICO', 'EK09', 'EK19', 'CENTRAL MEXICO', 'NEAR CDMX'
    ],
    weight: 2
  },

  // Mexico - XE2 (Northern)
  {
    patterns: ['XE2[A-Z]{2,3}'],
    qths: [
      'MONTERREY', 'TIJUANA', 'CIUDAD JUAREZ', 'HERMOSILLO',
      'MEXICO', 'EL29', 'DM12', 'NORTHERN MEXICO', 'BAJA'
    ],
    weight: 1.5
  },

  // Mexico - XE3 (Southern)
  {
    patterns: ['XE3[A-Z]{2,3}'],
    qths: [
      'GUADALAJARA', 'MERIDA', 'CANCUN', 'VERACRUZ',
      'MEXICO', 'DL90', 'EK56', 'SOUTHERN MEXICO', 'YUCATAN'
    ],
    weight: 1
  },

  // Peru
  {
    patterns: ['OA[0-9][A-Z]{2,3}'],
    qths: ['LIMA', 'CUSCO', 'AREQUIPA', 'PERU', 'FH17', 'FH07', 'NEAR LIMA'],
    weight: 1
  },

  // Venezuela
  {
    patterns: ['YV[0-9][A-Z]{2,3}'],
    qths: ['CARACAS', 'MARACAIBO', 'VALENCIA', 'VENEZUELA', 'FK60', 'FK50'],
    weight: 1
  },

  // Uruguay
  {
    patterns: ['CX[0-9][A-Z]{2,3}'],
    qths: ['MONTEVIDEO', 'URUGUAY', 'GF15', 'GF16', 'NEAR MONTEVIDEO'],
    weight: 0.5
  },

  // Costa Rica
  {
    patterns: ['TI[0-9][A-Z]{2,3}'],
    qths: ['SAN JOSE', 'COSTA RICA', 'EJ79', 'CENTRAL AMERICA'],
    weight: 0.5
  },

  // Panama
  {
    patterns: ['HP[0-9][A-Z]{2,3}'],
    qths: ['PANAMA CITY', 'PANAMA', 'FJ08', 'FJ09'],
    weight: 0.5
  },

  // Cuba
  {
    patterns: ['CM[0-9][A-Z]{2,3}', 'CO[0-9][A-Z]{2,3}'],
    qths: ['HAVANA', 'SANTIAGO', 'CUBA', 'FL00', 'FL10'],
    weight: 0.5
  },

  // Dominican Republic
  {
    patterns: ['HI[0-9][A-Z]{2,3}'],
    qths: ['SANTO DOMINGO', 'SANTIAGO', 'DOMINICAN REPUBLIC', 'FK48', 'FK58'],
    weight: 0.5
  },

  // Puerto Rico
  {
    patterns: ['KP4[A-Z]{2,3}', 'WP4[A-Z]{2,3}'],
    qths: ['SAN JUAN', 'PONCE', 'PUERTO RICO', 'PR', 'FK68', 'FK77'],
    weight: 1
  },

  // Israel
  {
    patterns: ['4X[0-9][A-Z]{2,3}', '4Z[0-9][A-Z]{2,3}'],
    qths: ['TEL AVIV', 'JERUSALEM', 'HAIFA', 'ISRAEL', 'KM72', 'KM71'],
    weight: 1.5
  },

  // South Africa
  {
    patterns: ['ZS[0-9][A-Z]{2,3}'],
    qths: [
      'JOHANNESBURG', 'CAPE TOWN', 'DURBAN', 'PRETORIA',
      'SOUTH AFRICA', 'ZS', 'KG44', 'JF96', 'KF25'
    ],
    weight: 2
  },
];

/**
 * Select a LocationArea using weighted random selection
 */
function selectWeightedRandom(areas: LocationArea[]): LocationArea {
  const totalWeight = areas.reduce((sum, area) => sum + area.weight, 0);
  let random = Math.random() * totalWeight;

  for (const area of areas) {
    random -= area.weight;
    if (random <= 0) {
      return area;
    }
  }

  // Fallback to last area (should never happen)
  return areas[areas.length - 1];
}

/**
 * Helper function to generate a single character from bracket content
 */
function generateCharFromBracket(bracketContent: string): string {
  if (bracketContent === 'A-Z') {
    // Random uppercase letter
    return String.fromCharCode(65 + Math.floor(Math.random() * 26));
  } else if (bracketContent === '0-9') {
    // Random digit 0-9
    return String.fromCharCode(48 + Math.floor(Math.random() * 10));
  } else if (bracketContent.match(/^[0-9]-[0-9]$/)) {
    // Digit range like [1-4] or [4-9]
    const [minChar, maxChar] = bracketContent.split('-');
    const min = parseInt(minChar, 10);
    const max = parseInt(maxChar, 10);
    const randomDigit = min + Math.floor(Math.random() * (max - min + 1));
    return String(randomDigit);
  } else {
    throw new Error(`Unsupported bracket content: ${bracketContent}`);
  }
}

/**
 * Generate a random callsign from a pattern string
 * Supports:
 * - Literal characters: 'W', 'K', 'VE'
 * - [A-Z] - random uppercase letter
 * - [0-9] - random digit
 * - {n} - repeat previous token n times
 * - {n,m} - repeat previous token random count between n and m
 */
function generateFromPattern(pattern: string): string {
  let result = '';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    if (char === '[') {
      // Find the closing bracket
      const closeIndex = pattern.indexOf(']', i);
      if (closeIndex === -1) {
        throw new Error(`Unclosed bracket in pattern: ${pattern}`);
      }

      const bracketContent = pattern.slice(i + 1, closeIndex);

      // Check for repetition
      i = closeIndex + 1;
      if (i < pattern.length && pattern[i] === '{') {
        const closeBrace = pattern.indexOf('}', i);
        if (closeBrace === -1) {
          throw new Error(`Unclosed brace in pattern: ${pattern}`);
        }

        const braceContent = pattern.slice(i + 1, closeBrace);
        let repeatCount: number;

        if (braceContent.includes(',')) {
          // Range like {2,3}
          const [minStr, maxStr] = braceContent.split(',');
          const min = parseInt(minStr, 10);
          const max = parseInt(maxStr, 10);
          repeatCount = min + Math.floor(Math.random() * (max - min + 1));
        } else {
          // Fixed count like {3}
          repeatCount = parseInt(braceContent, 10);
        }

        // Generate a NEW random character for each repetition
        for (let j = 0; j < repeatCount; j++) {
          result += generateCharFromBracket(bracketContent);
        }
        i = closeBrace + 1;
      } else {
        // No repetition, just add one character
        result += generateCharFromBracket(bracketContent);
      }
    } else {
      // Literal character
      result += char;
      i++;
    }
  }

  return result;
}

/**
 * Generate a random amateur radio callsign and QTH
 * Returns an object with callsign and QTH string
 */
export function generateCallsign(): { callsign: string; qth: string } {
  // Select a location area based on weights
  const area = selectWeightedRandom(locationAreas);

  // Pick a random pattern from the area
  const pattern = area.patterns[Math.floor(Math.random() * area.patterns.length)];

  // Generate callsign from pattern
  const callsign = generateFromPattern(pattern);

  // Pick a random QTH from the area
  const qth = area.qths[Math.floor(Math.random() * area.qths.length)];

  return { callsign, qth };
}
