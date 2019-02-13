import { PHOENIX_CHART_TYPE } from '../enums/phoenix-chart-type';
import {
  PhoenixChartConfig,
  PhoenixChartPalette,
  PropertyOverridesMap
} from '../interfaces/phoenix-chart-config';
import { PhoenixChartData } from '../interfaces/phoenix-chart-data';
import { PhoenixChartOptions } from '../interfaces/phoenix-chart-options';
import * as Phoenix from '../lib/phoenix';
import { _getMapDefinition, _isMap } from './map-utils';

const DEFAULT_OPTIONS: PhoenixChartOptions = {
  height: 400,
  width: 500,
  animate: true,
  colors: null
};

export class PhoenixChart {
  private _type: PHOENIX_CHART_TYPE;
  private _data: PhoenixChartData;
  private _options: PhoenixChartOptions;
  private _instance: any;
  private _packet: string;
  public canvas: HTMLCanvasElement;

  constructor(
    type: PHOENIX_CHART_TYPE,
    data: PhoenixChartData,
    options?: PhoenixChartOptions
  ) {
    this._type = type;
    this._data = data;
    if (Array.isArray(data.rows)) {
      if (!Array.isArray(data.rows[0])) {
        // Array of objects. Transform data to correct format.
        this._data.rows = this.transformData(data.rows);
      }
    }
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._instance = this._createInstance();
    this._instance.setUsePhoenixHover(true);
    this.canvas = this._instance.getCanvas();
  }

  /**
   * Render the Phoenix chart on the canvas element
   */
  render() {
    this._instance.draw(null, !this._options.animate, false);
  }

  /**
   * Resize the Phoenix chart
   */
  resize(width: number, height: number) {
    this._instance.resize(width, height);
  }

  /**
   * Update the Phoenix chart with new data
   */
  update(data: PhoenixChartData, options?: PhoenixChartOptions) {
    if (options.colors) {
      // Changing color palette, update options
      this._options.colors = options.colors;
    }
    if (options.properties) {
      // Changing chart properties, update options
      this._options.properties = options.properties;
    }
    this._data = data;
    if (Array.isArray(data.rows)) {
      if (!Array.isArray(data.rows[0])) {
        // Array of objects. Transform data to correct format.
        this._data.rows = this.transformData(data.rows);
      }
    }
    const configString = this._createConfigString(
      this._type,
      data,
      this._options
    );
    this._packet = configString;
    this._instance.updateChartJson(configString, !this._options.animate);
  }

  /**
   * Update the Phoenix chart with a new set of chart property overrides
   */
  setChartProperties(properties: PropertyOverridesMap) {
    this._options.properties = properties;
    this.update(this._data);
  }

  /**
   * Reset the chart color palette to the Domo default palette, redraws the chart
   */
  resetColorPalette() {
    this._options.colors = null;
    this.update(this._data);
  }

  /**
   * Get the chart packet for debugging
   */
  getPacket(): string {
    return this._packet;
  }

  private transformData(rows) {
    const newRows = rows.map((row: Object) => {
      const newRow: any[] = [];
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          newRow.push(row[key]);
        }
      }
      return newRow;
    });

    return newRows;
  }

  private _createInstance() {
    const configString = this._createConfigString(
      this._type,
      this._data,
      this._options
    );
    const chart = Phoenix.createPhoenixWithChartState(
      configString,
      '{}',
      this._options.width,
      this._options.height,
      true,
      0
    );
    this._packet = configString;

    return chart;
  }

  private _createConfigString(
    type: PHOENIX_CHART_TYPE,
    data: PhoenixChartData,
    options?: PhoenixChartOptions
  ): string {
    const chartConfig = this._toPhoenixConfig(type, data, options);
    const configString = JSON.stringify(chartConfig);
    return configString;
  }

  private _toPhoenixConfig(
    type: PHOENIX_CHART_TYPE,
    data: PhoenixChartData,
    options?: PhoenixChartOptions
  ) {
    const config: PhoenixChartConfig = {
      datasources: {
        default: {
          type: 'ordered-column-list',
          data: {
            datasource: 'default',
            metadata: data.columns.map(col => ({ type: col.type })),
            mappings: data.columns.map(col => col.mapping),
            columns: data.columns.map(col => col.name),
            rows: data.rows,
            numRows: data.rows.length,
            numColumns: data.columns.length
          }
        }
      },
      components: {
        graph: !_isMap(type)
          ? {
            type: 'graph',
            badgetype: type,
            datasource: 'default',
            columnFormats: {},
            overrides: options.properties || {}
          }
          : null,
        map: _isMap(type)
          ? {
            type: 'map',
            badgetype: type,
            mapdef: 'map',
            datasource: 'default',
            columnFormats: {},
            overrides: options.properties || {}
          }
          : null
      },
      maps: _isMap(type) ? _getMapDefinition(type) : null,
      conditionalFormats: [],
      locale: 'en-US',
      version: '6'
    };
    if (_isMap(type)) {
      // Make sure there is nothing graphs related when it's not a graph
      delete config.components.graph;
    } else {
      // Make sure there is nothing maps related when it's not a map
      delete config.maps;
      delete config.components.map;
    }
    if (options.colors) {
      config.palette = this._createPalette(options.colors);
    }
    return config;
  }

  private _createPalette(colors: string[]): PhoenixChartPalette {
    const palette: PhoenixChartPalette = {
      colorRanges: [
        {
          name: 'CustomPalette',
          values: [...colors.map(color => color.substring(1))]
        }
      ],
      colorRules: [
        {
          min: 1,
          max: colors.length,
          values: [...colors.map((_color, index) => [0, index])]
        }
      ]
    };
    return palette;
  }
}