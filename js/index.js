//https://docs.google.com/spreadsheet/ccc?key=0AhRVhBQHWY2ZdEJXYXJUdlo3QVpGYTEzNUxWcC1ndVE

var Config = {
    spreadsheetKey: '0AhRVhBQHWY2ZdEJXYXJUdlo3QVpGYTEzNUxWcC1ndVE',
    workbookId: 'od6',
    lang: 'en',
    defaultPage: 'contacts',
    startLatLng: [56.938981, 24.532471],
    startZoom: 7,
    markerDropDelay: 100,

    trans: {
        lv: {
            menu_contacts: 'Kontakti',
            menu_portfolio: 'Portfolio',
            menu_lv: 'lv',
            menu_ru: 'ru',
            menu_en: 'en',
            portfolio_header: 'Projekti',
            contact_head_title: 'Nosaukums:',
            contact_head_services: 'Pakalpojumi:',
            contact_head_regnr: 'Reģ.Nr.:',
            contact_head_address: 'Adrese:',
            contact_head_phone: 'Telefons:',
            contact_head_email: 'E-pasts:',
            contact_value_title: 'Kompānija, SIA',
            contact_value_services: '<li>Sample service 1</li><li>Sample service 2</li><li>Sample service 3</li>'
        },
        ru: {
            menu_contacts: 'Контакты',
            menu_portfolio: 'Портфольио',
            menu_lv: 'лв',
            menu_ru: 'ру',
            menu_en: 'ен',
            portfolio_header: 'Проекты',
            contact_head_title: 'Название:',
            contact_head_services: 'Услуги:',
            contact_head_regnr: 'Рег.Нр.:',
            contact_head_address: 'Адрес:',
            contact_head_phone: 'Телефон:',
            contact_head_email: 'Е-майл:',
            contact_value_title: 'Компания, ООО',
            contact_value_services: '<li>Sample service 1</li><li>Sample service 2</li><li>Sample service 3</li>'
        },
        en: {
            menu_contacts: 'Contacts',
            menu_portfolio: 'Portfolio',
            menu_lv: 'lv',
            menu_ru: 'ru',
            menu_en: 'en',
            portfolio_header: 'Projects',
            contact_head_title: 'Name:',
            contact_head_services: 'Services:',
            contact_head_regnr: 'Reg.Nr.:',
            contact_head_address: 'Address:',
            contact_head_phone: 'Phone:',
            contact_head_email: 'E-mail:',
            contact_value_title: 'Company, Ltd.',
            contact_value_services: '<li>Sample service 1</li><li>Sample service 2</li><li>Sample service 3</li>'
        }
    },

    LoadLanguage: function (lang) {
        Config.lang = lang;
        $('.langdiv a').removeClass('selected');
        $('#menu_' + lang).addClass('selected');

        for (var id in this.trans[lang]) {
            $('#' + id).html(this.trans[lang][id]);
        }
    },

    GetSpreadsheetUrl: function () {
        return 'https://spreadsheets.google.com/feeds/list/' + this.spreadsheetKey + '/' + this.workbookId + '/public/values?alt=json-in-script';
    },

    Init: function () {
        Config.LoadLanguage(Config.lang);

        $.ajaxSetup({
            type: 'POST',
            cache: false,
            dataType: 'jsonp',
            timeout: 5000
        });
    }
};

$(document).ready(function () {
    Config.Init();
    Navigator.Init();
});

var Navigator = new (function () {
    this.Init = function () {
        this.load(Config.defaultPage);
        $('.menudiv a').on('click', function () { Navigator.load($(this).attr('id').replace('menu_', '')); });
        $('.langdiv a').on('click', function () {
            Config.LoadLanguage($(this).attr('id').replace('menu_', ''));
            PortfolioVM.SpreadsheetLoaded(PortfolioVM.originalResponse);
        });

        return self;
    };

    this.goto = function (page) {
        $('.page').addClass('hide');
        $('.menudiv a').removeClass('selected');
        $('#page_' + page).removeClass('hide');
        $('#menu_' + page).addClass('selected');
    };

    this.load = function (page) {
        this.goto(page);

        if (!$('#menu_' + page).attr('ok')) {
            switch (page) {
                case 'portfolio':
                    ko.applyBindings(PortfolioVM.Init(), $('#page_portfolio')[0]);
                    break;
                default:
                    break;
            }
        }

        $('#menu_' + page).attr('ok', 'ok');
    }
})();

var PortfolioItemModel = function (item, idx) {
    this.idx = idx;
    this.id = item['gsx$id'].$t;
    this.lng = item['gsx$lng'].$t;
    this.lat = item['gsx$lat'].$t;
    if (item['gsx$tumb'].$t.length == 0) {
        item['gsx$tumb'].$t = '/img/default_item.jpg';
    }
    this.tumb = item['gsx$tumb'].$t;
    this.tumbcss = "url('" + this.tumb + "')";
    this.title = item['gsx$title0' + Config.lang].$t;
    this.imgs = [];

    for (var i = 1; i <= 5; i++) {
        var temp = item['gsx$img0' + i].$t;
        if (temp.length > 0) {
            this.imgs.push(temp);
        }
    }
};

var PortfolioVM = new (function () {
    var self = this;
    self.items = ko.observableArray();
    self.gmap = null;
    self.gmarkers = [];
    self.ginfo = new google.maps.InfoWindow();
    self.originalResponse = null;

    self.Init = function () {
        $.ajax({
            url: Config.GetSpreadsheetUrl(),
            success: function (result) {
                self.originalResponse = result;
                self.SpreadsheetLoaded(self.originalResponse);
            }
        });

        $('#page_portfolio').on('click', '.pitem', self.OnItemClicked);

        self.gmap = new google.maps.Map($('#map')[0], {
            center: new google.maps.LatLng(Config.startLatLng[0], Config.startLatLng[1]),
            zoom: Config.startZoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL
            },
            styles: [
                {
                    stylers: [
                        { saturation: -100 }
                      ]
                }
            ],
            scrollwheel: false
        });

        google.maps.event.addListener(self.gmap, 'click', function () {
            PortfolioVM.ginfo.close();
        });

        return self;
    };

    self.SpreadsheetLoaded = function (result) {
        for (var i = 0; i < self.gmarkers.length; i++) {
            self.gmarkers[i].setMap(null);
        }
        self.gmarkers = [];

        self.items.removeAll();

        for (var i = 0; i < result.feed.entry.length; i++) {
            var item = new PortfolioItemModel(result.feed.entry[i], i);
            self.items.push(item);
        }

        self.DropMarkers();
    };

    self.DropMarkers = function () {
        self.gmarkeriterator = 0;
        for (var i = 0; i < self.items().length; i++) {
            setTimeout(function () {
                self.AddMarker();
            }, i * Config.markerDropDelay);
        }
    };

    self.OnItemClicked = function () {
        var temp = '<div class="fancyDiv">';
        var thisItem = self.items()[parseInt($(this).attr('idx'))];

        for (var i = 0; i < thisItem.imgs.length; i++) {
            temp += '<img src="' + thisItem.imgs[i] + '"/>';
        }
        temp += "</div>";

        $.fancybox(
		    temp,
		    {
		        autoDimensions: false,
		        width: 650,
		        height: 500,
		        transitionIn: 'none',
		        transitionOut: 'none'
		    }
	    );
    };

    self.gmarkeriterator = 0;
    self.AddMarker = function () {

        var newMarker = new google.maps.Marker({
            position: new google.maps.LatLng(self.items()[self.gmarkeriterator].lat, self.items()[self.gmarkeriterator].lng),
            map: self.gmap,
            draggable: false,
            animation: google.maps.Animation.DROP
        });

        newMarker.item = self.items()[self.gmarkeriterator];

        google.maps.event.addListener(newMarker, 'click', function () {
            var content =
                '<div class="pitem" style="background-image: ' + this.item.tumbcss + '; margin: 5px;" idx="' + this.item.idx + '">' +
                    '<div class="pitemtitle">' + this.item.title + '</div>' +
                '</div>';
            self.ginfo.setContent(content);
            self.ginfo.open(PortfolioVM.gmap, this);
        });

        self.gmarkers.push(newMarker);
        self.gmarkeriterator++;
    }
})();